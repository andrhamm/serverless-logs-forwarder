/* eslint-disable no-console, import/no-extraneous-dependencies */
import { getEnv } from '../lib/common';
import { getExpiry, setExpiry } from '../lib/cloudwatch-utils';

let env;
export const handler = async (sqsEvent) => {
  if (!env) {
    env = await getEnv([
      'KINESIS_DESTINATION_ARN',
      'LOG_GROUP_PREFIX',
      'RETENTION_DAYS',
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
  if (!logGroupName) {
    logGroupName = event.detail.requestParameters.logGroupName;

    if (env.LOG_GROUP_PREFIX && !logGroupName.startsWith(env.LOG_GROUP_PREFIX)) {
      console.log(`ignoring the log group [${logGroupName}] because it doesn't match the prefix [${env.LOG_GROUP_PREFIX}]`);
      return;
    }
  }

  if (!(await getExpiry(logGroupName))) {
    await setExpiry({ logGroupName, retentionInDays: env.RETENTION_DAYS });
    console.log(`updated [${logGroupName}]'s retention policy to ${env.RETENTION_DAYS} days`);
  }
};
