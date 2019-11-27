/* eslint-disable no-console, import/no-extraneous-dependencies */
import AWS from 'aws-sdk'; // this dep is present in Lambda environment automatically
import pMap from 'p-map';
import { getEnv } from '../lib/common';
import { tryGetObjectJSON } from '../lib/s3-utils';

const lambda = new AWS.Lambda({ apiVersion: '2015-03-31' });

let env;

export const handler = async (event, context, callback) => {
  if (!env) {
    env = await getEnv([
      'S3_BUCKET_NAME',
      'LAMBDA_FUNCTION_NAME_PREFIX',
    ]);
  }

  const mappingParams = {
    Bucket: env.S3_BUCKET_NAME,
    Key: 'cloudwatch-cloudformation-mapping.json',
  };

  const mapping = await tryGetObjectJSON(mappingParams);
  const logGroups = Object.keys(mapping);

  const { lambdaFunctionName } = event;

  if (!lambdaFunctionName) {
    callback('Event missing \'lambdaFunctionName\' property');
    return;
  }

  const fullFunctionName = lambdaFunctionName.startsWith(env.LAMBDA_FUNCTION_NAME_PREFIX) ?
    lambdaFunctionName : `${env.LAMBDA_FUNCTION_NAME_PREFIX}${lambdaFunctionName}`;

  console.log(`Async invoking '${fullFunctionName}' function for ${logGroups.length} log groups`);

  await pMap(logGroups, logGroupName => lambda.invoke({
    FunctionName: fullFunctionName,
    InvocationType: 'Event',
    Payload: JSON.stringify({ logGroupName }),
  }).promise(), { concurrency: 4 });
};
