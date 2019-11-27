import * as parse from '../lib/parse';
import { kinesisifyRecord, mockKinesisCloudWatchLogsEventRecords } from './__helpers__/kinesis';

afterEach(() => { jest.resetAllMocks(); });

describe('parse', () => {
  describe('parsePayload', () => {
    it('decodes and unzips record payload', () => {
      const expected = mockKinesisCloudWatchLogsEventRecords[0];

      const record = kinesisifyRecord(expected);

      const result = parse.parsePayload(record);

      expect(result).toEqual(expected);
    });
  });

  describe('extractRecords', () => {
    it('returns filtered and decoded records', () => {
      const eventRecords = mockKinesisCloudWatchLogsEventRecords.map(kinesisifyRecord);

      const result = parse.extractRecords(eventRecords);

      expect(result).toMatchSnapshot();
    });
  });

  describe('extractLogs', () => {
    it('returns parsed log objects', () => {
      const records = mockKinesisCloudWatchLogsEventRecords;

      const eventRecords = records.map(kinesisifyRecord);

      const result = parse.extractLogs(eventRecords);

      expect(result).toMatchSnapshot();
    });
  });

  describe('parseFunctionName', () => {
    it('returns lambda name from log group name', () => {
      expect(parse.parseFunctionName('/aws/lambda/my-stack-my_function')).toMatchSnapshot();
    });
  });

  describe('parseLambdaVersion', () => {
    it('returns lambda version from log stream name', () => {
      const logStream = '2018/11/05/[$LATEST]a3a206b7b35f414f9f567242385ede8a';
      const result = parse.parseLambdaVersion(logStream);

      expect(result).toEqual('$LATEST');
    });
  });

  describe('parseLogMessage', () => {
    it('returns null for entry missing id', () => {
      expect(parse.parseLogMessage({
        extractedFields: {
          event: 'my event\n',
        },
      })).toBeNull();
    });

    it('returns null for START entry', () => {
      expect(parse.parseLogMessage({
        id: 1,
        extractedFields: {
          event: 'START RequestId: 67c005bb-641f-11e6-b35d-6b6c651a2f01 Version: 31\n',
        },
      })).toBeNull();
    });

    it('returns null for END entry', () => {
      expect(parse.parseLogMessage({
        id: 1,
        extractedFields: {
          event: 'END RequestId: 5e665f81-641f-11e6-ab0f-b1affae60d28\n',
        },
      })).toBeNull();
    });

    it('returns null for REPORT entry', () => {
      expect(parse.parseLogMessage({
        id: 1,
        extractedFields: {
          event: 'REPORT RequestId: 5e665f81-641f-11e6-ab0f-b1affae60d28\tDuration: 1095.52 ms\tBilled Duration: 1100 ms \tMemory Size: 128 MB\tMax Memory Used: 32 MB\t\n',
        },
      })).toBeNull();
    });

    it('parses normal log message', () => {
      const logEvent = {
        id: 1,
        extractedFields: {
          request_id: 4467343,
          event: 'my event',
          timestamp: 1541438252943,
        },
      };

      const result = parse.parseLogMessage(logEvent);

      expect(result).toEqual({
        level: 'info',
        message: 'my event',
        request_id: 4467343,
        '@timestamp': new Date(1541438252943),
      });
    });

    it('parses json object as fields', () => {
      const jsonLogBody = {
        level: 'warn',
        message: 'my event',
        customField: 'something else',
      };

      const logEvent = {
        id: 1,
        extractedFields: {
          request_id: 4467343,
          event: JSON.stringify(jsonLogBody),
          timestamp: 1541438252943,
        },
      };

      const result = parse.parseLogMessage(logEvent);

      expect(result).toEqual({
        level: 'warn',
        message: 'my event',
        request_id: 4467343,
        fields: {
          customField: 'something else',
        },
        '@timestamp': new Date(1541438252943),
      });
    });
  });
});
