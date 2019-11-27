import * as cwUtils from '../lib/cloudwatch-utils';
import { handler } from '../functions/subscribe';

afterEach(() => { jest.resetAllMocks(); });

describe('subscribe', () => {
  describe('handler', () => {
    beforeAll(() => {
      process.env.KINESIS_DESTINATION_ARN = 'dest-arn';
      process.env.ROLE_ARN = 'role-arn';
      process.env.LOG_GROUP_PREFIX = '/aws/lambda';
    });

    afterAll(() => {
      delete process.env.KINESIS_DESTINATION_ARN;
      delete process.env.ROLE_ARN;
      delete process.env.LOG_GROUP_PREFIX;
    });

    it('only subscribes log groups with names matching the prefix', async () => {
      expect.assertions(1);

      const subscribe = jest.spyOn(cwUtils, 'subscribe');
      subscribe.mockResolvedValue({});

      const logGroupName = '/non-matching/log-group/prefix';
      await handler({ detail: { requestParameters: { logGroupName } } });

      expect(subscribe).not.toHaveBeenCalled();
    });

    it('calls subscribe with expected args from cloudwatch event', async () => {
      expect.assertions(1);

      const subscribe = jest.spyOn(cwUtils, 'subscribe');
      subscribe.mockResolvedValue({});

      const logGroupName = '/aws/lambda/my-log-group';
      await handler({ detail: { requestParameters: { logGroupName } } });

      expect(subscribe.mock.calls[0][0]).toEqual({
        logGroupName,
        destinationArn: process.env.KINESIS_DESTINATION_ARN,
        roleArn: process.env.ROLE_ARN,
      });
    });

    it('calls subscribe with expected args from manual invocation event', async () => {
      expect.assertions(1);

      const subscribe = jest.spyOn(cwUtils, 'subscribe');
      subscribe.mockResolvedValue({});

      const logGroupName = '/aws/lambda/my-log-group';
      await handler({ logGroupName });

      expect(subscribe.mock.calls[0][0]).toEqual({
        logGroupName,
        destinationArn: process.env.KINESIS_DESTINATION_ARN,
        roleArn: process.env.ROLE_ARN,
      });
    });

    it('logs if loggroup already has a subscription', async () => {
      expect.assertions(1);

      const subscribe = jest.spyOn(cwUtils, 'subscribe');
      subscribe.mockImplementation(() => new Promise((resolve, reject) => {
        const err = new Error();
        err.code = 'LimitExceededException';
        reject(err);
      }));

      const logGroupName = '/aws/lambda/my-log-group';

      const consoleSpy = jest.spyOn(global.console, 'log');

      await handler({ detail: { requestParameters: { logGroupName } } });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('already has a subscription filter policy'));
    });
  });
});
