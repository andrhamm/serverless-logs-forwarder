import zlib from 'zlib';
import { tryParseJson } from './common';

export const parsePayload = (record) => {
  // return Buffer.from(record.kinesis.data, 'base64').toString('utf8')
  const payload = Buffer.from(record.kinesis.data, 'base64');
  const json = (zlib.gunzipSync(payload)).toString('utf8');
  return JSON.parse(json);
};

// filter out CONTROL_MESSAGE records
export const extractRecords = records => records
  .map(exports.parsePayload).filter(r => r.messageType === 'DATA_MESSAGE');

// logGroup looks like this:
//    "logGroup": "/aws/lambda/service-env-funcName"
export const parseFunctionName = logGroup => logGroup.split('/').reverse()[0];

// logStream looks like this:
//    "logStream": "2016/08/17/[76]afe5c000d5344c33b5d88be7a4c55816"
export const parseLambdaVersion = (logStream) => {
  const start = logStream.indexOf('[');
  const end = logStream.indexOf(']');
  return logStream.substring(start + 1, end);
};

/* eslint-disable max-len */
// a Lambda function log message looks like this:
//    "2017-04-26T10:41:09.023Z db95c6da-2a6c-11e7-9550-c91b65931beb\tloading index.html...\n"
// but there are START, END and REPORT messages too:
//    "START RequestId: 67c005bb-641f-11e6-b35d-6b6c651a2f01 Version: 31\n"
//    "END RequestId: 5e665f81-641f-11e6-ab0f-b1affae60d28\n"
//    "REPORT RequestId: 5e665f81-641f-11e6-ab0f-b1affae60d28\tDuration: 1095.52 ms\tBilled Duration: 1100 ms \tMemory Size: 128 MB\tMax Memory Used: 32 MB\t\n"
/* eslint-enable max-len */
export const parseLogMessage = (logEvent) => {
  const { extractedFields } = logEvent;

  if (!logEvent.id ||
      extractedFields.event.startsWith('START RequestId') ||
      extractedFields.event.startsWith('END RequestId') ||
      extractedFields.event.startsWith('REPORT RequestId')) {
    return null;
  }

  // eslint-disable-next-line prefer-const
  let { event, timestamp } = extractedFields;

  const requestId = extractedFields.request_id;

  delete extractedFields.request_id;
  delete extractedFields.event;
  delete extractedFields.timestamp;

  const fields = extractedFields;

  const jsonFields = tryParseJson(event);
  if (jsonFields) {
    if (typeof jsonFields === 'object') {
      if (jsonFields.message) {
        event = jsonFields.message;
        delete jsonFields.message;
      } else {
        event = null;
      }
      Object.assign(fields, jsonFields);
    }
  }

  const level = (fields.level || 'info').toLowerCase();

  delete fields.level;


  const result = {
    level,
    message: event,
    request_id: requestId,
    '@timestamp': new Date(timestamp),
  };

  if (Object.keys(fields).length > 0) {
    result.fields = fields;
  }

  return result;
};

export const parseLogGroupEvents = (logGroup, logStream, logEvents) => {
  const version = parseLambdaVersion(logStream);
  const functionName = parseFunctionName(logGroup);

  const logs = [];

  for (const logEvent of logEvents) {
    try {
      const log = parseLogMessage(logEvent);

      if (log) {
        log.id = logEvent.id;
        log.type = 'cloudwatch';
        log.logStream = logStream;
        log.logGroup = logGroup;
        log.functionName = functionName;
        log.lambdaVersion = version;

        logs.push(log);
      }
    } catch (err) {
      console.error(err.message);
    }
  }

  return logs;
};

export const extractLogs = (eventRecords) => {
  const records = extractRecords(eventRecords);
  return records.reduce((acc, { logGroup, logStream, logEvents }) => {
    const logs = parseLogGroupEvents(logGroup, logStream, logEvents);
    acc.push(...logs);

    return acc;
  }, []);
};
