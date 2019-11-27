import { cloudWatchLogs } from '../lib/aws-clients';
import * as utils from '../lib/cloudwatch-utils';

jest.mock('../lib/aws-clients');

afterEach(() => { jest.resetAllMocks(); });

describe('cloudwatch-utils', () => {
  describe('getLogGroup', () => {
    it('paginates to find the cloudwatch loggroup object', async () => {
      expect.assertions(1);

      const logGroupName = '/aws/lambda/my-log-group-getLogGroup';

      cloudWatchLogs.describeLogGroups = jest.fn();
      cloudWatchLogs.describeLogGroups.mockReturnValueOnce({
        promise: () => ({
          nextToken: 'getLogGroupNextToken',
          logGroups: [
            { logGroupName: '/aws/lambda/not-my-log-group-1' },
            { logGroupName: '/aws/lambda/not-my-log-group-2' },
            { logGroupName: '/aws/lambda/not-my-log-group-3' },
          ],
        }),
      }).mockReturnValueOnce({
        promise: () => ({
          logGroups: [
            { logGroupName },
          ],
        }),
      });

      const result = await utils.getLogGroup(logGroupName);

      expect(result).toEqual({ logGroupName });
    });
  });

  describe('subscribe', () => {
    it('updates the subscription filter policy on the loggroup', async () => {
      expect.assertions(1);

      const expectedArgs = {
        logGroupName: '/aws/lambda/my-log-group-subscribe',
        destinationArn: 'kinesis-arn',
        roleArn: 'role-arn',
      };

      cloudWatchLogs.putSubscriptionFilter = jest.fn();
      cloudWatchLogs.putSubscriptionFilter.mockReturnValueOnce({ promise: () => {} });

      await utils.subscribe(expectedArgs);

      expect(cloudWatchLogs.putSubscriptionFilter)
        .toBeCalledWith(expect.objectContaining(expectedArgs));
    });
  });

  describe('setExpiry', () => {
    it('updates the retention policy on the loggroup', async () => {
      expect.assertions(1);

      const expectedArgs = {
        logGroupName: '/aws/lambda/my-log-group-setExpiry',
        retentionInDays: '7',
      };

      cloudWatchLogs.putRetentionPolicy = jest.fn();
      cloudWatchLogs.putRetentionPolicy.mockReturnValueOnce({ promise: () => {} });

      await utils.setExpiry(expectedArgs);

      expect(cloudWatchLogs.putRetentionPolicy)
        .toBeCalledWith(expect.objectContaining(expectedArgs));
    });
  });

  describe('getExpiry', () => {
    it('gets the retention policy for the loggroup', async () => {
      expect.assertions(1);

      const logGroupName = '/aws/lambda/my-log-group-setExpiry';

      const spy = jest.spyOn(utils, 'getLogGroup');
      spy.mockResolvedValue({ retentionInDays: 42 });

      const result = await utils.getExpiry(logGroupName);

      expect(result).toBe(42);
    });
  });
});
