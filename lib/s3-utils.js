import { tryParseJson } from './common';

import { s3 } from '../lib/aws-clients';

export const tryGetObjectJSON = async (params) => {
  let mappingObject;
  try {
    mappingObject = await s3.getObject(params).promise();
  } catch (e) {
    if (e.code !== 'NoSuchKey') {
      throw e;
    }
  }

  let mapping = {};
  if (mappingObject && mappingObject.Body) {
    const decoded = tryParseJson(mappingObject.Body);

    if (decoded) mapping = decoded;
  }

  return mapping;
};

export const putObjectJSON = (params, mapping) => s3.putObject({
  Body: JSON.stringify(mapping),
  ContentType: 'application/json',
  ...params,
}).promise();
