/* eslint-disable no-console */
import { getEnv } from '../lib/common';
import { subscribe, logGroupGetTag } from '../lib/cloudwatch-utils';

let env;

export const handler = async (sqsEvent) => {
  if (!env) {
    env = await getEnv([
      'KINESIS_DESTINATION_ARN',
      'LOG_GROUP_PREFIX',
      'ROLE_ARN',
    ]);
  }

  let event;
  if (sqsEvent.Records) {
    event = JSON.parse(sqsEvent.Records[0].body);
  } else {
    event = sqsEvent;
  }

  // eg. /aws/lambda/logging-demo-dev-api
  let logGroupName = event.logGroupName;
  if (!event.logGroupName) {
    logGroupName = event.detail.requestParameters.logGroupName;

    if (env.LOG_GROUP_PREFIX && !logGroupName.startsWith(env.LOG_GROUP_PREFIX)) {
      console.log(`ignoring the log group [${logGroupName}] because it doesn't match the prefix [${env.LOG_GROUP_PREFIX}]`);
      return;
    }
  }

  if (logGroupGetTag('DisableForwarding') === 'true') {
    console.log(`ignoring the log group [${logGroupName}] because it is tagged with DisableForwarding=true`);
    return;
  }

  try {
    await subscribe({
      logGroupName,
      destinationArn: env.KINESIS_DESTINATION_ARN,
      roleArn: env.ROLE_ARN,
    });
    console.log(`subscribed [${logGroupName}] to [${env.KINESIS_DESTINATION_ARN}]`);
  } catch (e) {
    if (e.code === 'LimitExceededException') {
      console.log(`[${logGroupName}] already has a subscription filter policy`);
    } else {
      throw e;
    }
  }
};
