import { getEnv } from '../lib/common';
import { extractLogs } from '../lib/parse';
import * as elasticsearch from '../lib/elasticsearch-utils';
import { tryGetObjectJSON } from '../lib/s3-utils';

let mapping;
let env;
let es;

export const handler = async (event) => {
  if (!env) {
    env = await getEnv([
      'ELASTICSEARCH_HOST',
      'ELASTICSEARCH_HTTPAUTH_ENCRYPTED',
      'S3_BUCKET_NAME',
    ]);
  }

  const mappingParams = {
    Bucket: env.S3_BUCKET_NAME,
    Key: 'cloudwatch-cloudformation-mapping.json',
  };

  let mappingPromise;
  if (!mapping) {
    mappingPromise = tryGetObjectJSON(mappingParams);
  }

  const logs = extractLogs(event.Records);
  delete event.Records;

  const dt = new Date();
  const indexDate = [
    dt.getFullYear(),
    (`0${dt.getMonth() + 1}`).slice(-2),
    (`0${dt.getDate()}`).slice(-2),
  ].join('.');

  if (mappingPromise) mapping = await mappingPromise;

  const body = logs.reduce((acc, log) => {
    const stackOrServiceName = mapping[log.logGroup] || 'lambda';

    acc.push({
      index: {
        _index: `cloudwatchlogs-${stackOrServiceName}-${indexDate}`,
        _type: 'cloudwatchlog',
        _id: log.id,
      },
    });

    delete log.id;

    acc.push(log);

    return acc;
  }, []);

  if (body.length > 0) {
    if (!es) {
      es = elasticsearch.client({
        host: env.ELASTICSEARCH_HOST,
        httpAuth: env.ELASTICSEARCH_HTTPAUTH,
      });
    }

    await es.bulk({ body });
  }
};
