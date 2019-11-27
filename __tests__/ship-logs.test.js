import * as elasticsearch from '../lib/elasticsearch-utils';
import * as s3Utils from '../lib/s3-utils';
import { kinesisifyRecord, mockKinesisCloudWatchLogsEventRecords } from './__helpers__/kinesis';
import { handler } from '../functions/ship-logs';

jest.mock('../lib/elasticsearch-utils');
jest.mock('../lib/s3-utils');

afterEach(() => { jest.resetAllMocks(); });

describe('ship-logs', () => {
  describe('handler', () => {
    it('calls elasticsearch bulk', async () => {
      expect.assertions(1);

      const mockMapping = mockKinesisCloudWatchLogsEventRecords.reduce((acc, r, i) => {
        if (!acc[r.logGroup]) {
          acc[r.logGroup] = `stack-${i}`;
        }

        return acc;
      }, {});

      const tryGetObjectJSON = jest.spyOn(s3Utils, 'tryGetObjectJSON');
      tryGetObjectJSON.mockResolvedValue(mockMapping);

      const client = jest.spyOn(elasticsearch, 'client');
      const esBulkFn = jest.fn();

      client.mockReturnValue({
        bulk: esBulkFn,
      });

      await handler({
        Records: mockKinesisCloudWatchLogsEventRecords.map(kinesisifyRecord),
      });

      expect(esBulkFn.mock.calls[0]).toMatchSnapshot();
    });
  });
});
