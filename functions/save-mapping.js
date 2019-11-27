/* eslint-disable no-console */
import { getEnv } from '../lib/common';
import { tryGetObjectJSON, putObjectJSON } from '../lib/s3-utils';
import { getLogGroupStackMapping } from '../lib/cloudformation-utils';

let env;

export const handler = async () => {
  if (!env) {
    env = await getEnv([
      'LOG_GROUP_PREFIX',
      'S3_BUCKET_NAME',
    ]);
  }

  const mappingParams = {
    Bucket: env.S3_BUCKET_NAME,
    Key: 'cloudwatch-cloudformation-mapping.json',
  };

  const [mapping, prevMapping] = await Promise.all([
    getLogGroupStackMapping({ logGroupNamePrefix: env.LOG_GROUP_PREFIX }),
    tryGetObjectJSON(mappingParams),
  ]);

  const newMapping = {
    ...prevMapping,
    ...mapping,
  };

  console.log(`Saving mapping for ${Object.keys(newMapping).length} log groups`);

  await putObjectJSON(mappingParams, newMapping);
};
