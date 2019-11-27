# serverless-logs-forwarder

A Serverless app to automatically ship CloudWatch Logs (specifically those generated by Lambda functions, but configurable) to ELK. The solution uses CloudWatch Logs Subscriptions to deliver the logs to a Kinesis Stream, which is processed by a Lambda that sends the log events to ELK. Additionally, new CloudWatch LogGroups are automatically subscribed (based on their prefix)!

Notes:
  * Tag LogGroups with `DisableForwarding=true` to prevent this service from automatically forwarding logs to ELK.
  * The Kinesis subscription for LogGroups has a 5 minute delay to allow time for adding tags to the LogGroup after creation (CloudFormation does not currently support specifying tags on LogGroup resources so they must be done via API calls). This means logs for newly created LogGroups won't begin forwarding until at least 5 minutes after creation.

## Overview

### Lambda function `queue-event` and SNS to SQS fan-out

Note: Requires AWS API write events to be tracked in CloudTrail!

The `subscribe`, `set-retention`, `save-index-pattern`, and `save-mapping` functions all respond to CloudWatch events triggered by the creation of new LogGroups (when a new Lambda is created a corresponding new LogGroup is also created). For improved observability, the only function subscribing to the CloudWatch event (`CreateLogGroup`) is the `queue-event` function which proxies the event to an SNS topic, which fans out to multiple SQS queues; one for each of the aforementioned functions. In doing so, exceptions and retries are easily observed by looking at the SQS queues and their associated dead letter queues.

### Lambda function: `subscribe`

The creation of a new CloudWatch LogGroup will trigger the `subscribe` Lambda (via the CloudWatch Event). The new LogGroup is then updated with a subscription filter that specifies that all log events in the LogGroup should be delivered to the Kinesis Stream.

Note: Only LogGroups that match the configured prefix are auto-subscribed (see [serverless.yml](serverless.yml)).

New: Tag LogGroups with `DisableForwarding=true` to prevent this service from automatically forwarding logs to ELK.

### Lambda function: `set-retention`

The creation of a new CloudWatch LogGroup will trigger the `set-retention` Lambda (via the CloudWatch Event). The new LogGroup is then updated with the specified retention policy. This means log entries get deleted after the specified number of days. Only LogGroups with undefined retention policies will be updated, existing retention policies will not be overwritten.

Note: Only LogGroups that match the configured prefix are updated (see [serverless.yml](serverless.yml)).

### Lambda function: `save-index-pattern`

The creation of a new CloudWatch LogGroup will trigger the `save-index-pattern` Lambda (via the CloudWatch Event). If the new LogGroup is the resource of a CloudFormation Stack, a Kibana Index Pattern will be created/updated based on the Stack name.

The Kibana Index Pattern for a LogGroup `/aws/lambda/my-serverless-app-stage-my_function` that belongs to the CloudFormation Stack `my-serverless-app-stage` would look like `cloudwatchlogs-my-serverless-app-*`. LogGroups that are not part of a CloudFormation Stack won't have an Index Pattern created, but the logs will be indexed in the `cloudwatchlogs-lambda-*` indexes.

Note: Only LogGroups that match the configured prefix are updated (see [serverless.yml](serverless.yml)).

### Lambda function: `ship-logs`

This Lambda acts as a Kinesis consumer and is responsible for parsing a CloudWatch Log entry and shipping it to ELK. The max concurrency for this function is equal to the number of shards in the Kinesis stream. Because of this, there is no need to explicitly set the value of `reservedConcurrency` in the function config. Messages in the stream are processed in FIFO order.

Logs are indexed based on their corresponding CloudFormation Stack. The index for a LogGroup `/aws/lambda/my-serverless-app-stage-my_function` that belongs to the CloudFormation Stack `my-serverless-app-stage` would look like `cloudwatchlogs-my-serverless-app-2018.10.26`. LogGroups that are not part of a CloudFormation Stack will be indexed in indexes named like`cloudwatchlogs-lambda-2018.10.26`.

### Lambda function: `save-mapping`

The creation of a new CloudWatch LogGroup will trigger the `save-mapping` Lambda (via the CloudWatch Event). The function reads all CloudFormation Stacks and their Stack Resources to find all relevant CloudWatch LogGroups. The mapping of every relevant CloudWatch Group to their CloudFormation Stack is saved as a JSON object in S3. The `ship-logs` function uses this mapping to determine which ElasticSearch Index the log messages for the LogGroup will be routed to.

Note: Only LogGroups that match the configured prefix are updated (see [serverless.yml](serverless.yml)).

### Lambda function: `invoke-for-all`

This function is for manual invocations only and will not be triggered by any other event. This function will asynchronously invoke any of the other relevant lambdas in the service for every LogGroup in the current mapping saved in S3.

Manually invoke this function with the event `{"lambdaFunctionName": "subscribe"}` and all LogGroups for current CloudFormation Stacks will be subscribed.

Manually invoke this function with the event `{"lambdaFunctionName": "set-retention"}` and all LogGroups for current CloudFormation Stacks will have their retention policy updated.

Manually invoke this function with the event `{"lambdaFunctionName": "save-index-pattern"}` and all LogGroups for current CloudFormation Stacks will have their Kibana Index Pattern created/updated.

<!-- ### Lambda function: `scale-shards`

The creation of a new CloudWatch LogGroup will trigger the `scale-shards` Lambda (via the CloudWatch Event). The number of existing consumers on the stream, and the number of CloudWatch Log Groups matching the prefix, determine the shard count for the stream.

See [kinesis.describeStreamSummary()](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Kinesis.html#describeStreamSummary-property), [cloudWatchLogs.describeDestinations()](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CloudWatchLogs.html#describeDestinations-property), [cloudWatchLogs.describeLogGroups()](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CloudWatchLogs.html#describeLogGroups-property) -->
---

## Deployment

Take care to use the correct AWS Credential "profile". By default, this service assumes you have the credentials set in `~/.aws/credentials` with the profile name equal to that environment's AWS Account Name (`gasbuddy-staging`). If your profiles are named differently, be sure to use the `--profile` argument.

Note: Run these commands in the `serverless` directory

    serverless deploy --stage [stage|prod]

Specify profile override

    serverless deploy --stage stage --profile gasbuddy-staging

## Logs

Logs are located in CloudWatch Logs. They can be viewed from your browser via the AWS Console:

* [`prefix=/aws/lambda/cloudwatch-logs-elk-forwarder-*`](https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logs:prefix=/aws/lambda/cloudwatch-logs-elk-forwarder-)

You can interactively tail the logs for a given Lambda function by using the Serverless command line tools like so:

    serverless logs -f <function_name> -t

i.e.

    serverless logs -f subscribe -t

---

## Development

Note: Run these commands in the `serverless` directory

Lambdas can be invoked locally as long as your local environment has AWS credentials with the required IAM roles and permissions. Invoke locally and optionally specify event data like so:

    serverless invoke local -f subscribe -d '{"foo":"bar"}'

For more advanced options when invoking locally, see the [Serverless Doc: Invoke Local](https://serverless.com/framework/docs/providers/aws/cli-reference/invoke-local/)

### Secrets with KMS

On the initial deploy, you must first comment out the `awsKmsKeyArn` property in `serverless.yml`. Once the first deploy is finished, go to the [Encryption Keys section of the IAM Dashboard in the AWS Console](https://console.aws.amazon.com/iam/home?region=us-east-1#/encryptionKeys/us-east-1) and copy the ARN for the ` cloudwatch-logs-elk-forwarder-secrets`. Update the value of the `aws-kms-key-arn-secrets` property (with the copied ARN) in the appropriate config file (i.e. `config.stage.yml` for staging). Uncomment the `awsKmsKeyArn` property in `serverless.yml` and redeploy.

#### Add a new encrypted secret

The following command outputs the encrypted and base64-encoded string representation of the secret provided with the `--plaintext` option. Add the result to the function environment in `serverless.yml` and commit to source control.

    aws kms encrypt --key-id alias/cloudwatch-logs-elk-forwarder-secrets --output text --query CiphertextBlob --plaintext 'mysecret'

Note: you must have the necessary IAM permission and be added to `resources.Resources.SecretsKMSKey.KeyPolicy.Statement[0].Principal.AWS` in `serverless.yml` (requires a deploy by existing user from that list).


---

## Tests

The test suite uses [Jest](https://jestjs.io) and [Sinon](https://sinonjs.org). Serverless applications make extensive use of AWS services, which makes true integration tests a challenge, so the goal for testing is for full coverage with unit tests. Tests should not make any network requests, especially to authenticated AWS APIs.

Run the test suite:

    yarn test

Or simply:

    jest

During development, it may be useful to use Jest's `watch` feature, which has options for auto-reloading on code changes and auto running tests:

    jest --watch

---

## TODO

* Scale Kinesis shards based on log throughput or subscribed log group count (see `scale-shards`, and [this blog post](https://theburningmonk.com/2017/04/auto-scaling-kinesis-streams-with-aws-lambda/)
* Use an SQS DLQ on `subscribe` lambda (so we can stop eating exceptions)
* Full unit test coverage
* Use a logging library