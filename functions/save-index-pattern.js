/* eslint-disable no-console, import/no-extraneous-dependencies */
import { getEnv } from '../lib/common';
import { getStackNameForLogGroup } from '../lib/cloudformation-utils';
import { saveIndexPattern } from '../lib/kibana-utils';

let env;
export const handler = async (sqsEvent) => {
  if (!env) {
    env = await getEnv([
      'KIBANA_API_BASE',
      'LOG_GROUP_PREFIX',
      'STAGE',
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

  const stackName = await getStackNameForLogGroup(logGroupName);

  if (stackName) {
    await saveIndexPattern({
      stackName,
      stage: env.STAGE,
      kibanaApiBase: env.KIBANA_API_BASE,
    });

    console.log(`updated [${logGroupName}]'s kibana index pattern`);
  } else {
    console.log(`no stack for [${logGroupName}], skipping kibana index pattern`);
  }
};
