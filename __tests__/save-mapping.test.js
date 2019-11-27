import * as s3Utils from '../lib/s3-utils';
import * as cfUtils from '../lib/cloudformation-utils';
import { handler } from '../functions/save-mapping';

afterEach(() => { jest.resetAllMocks(); });

describe('save-mapping', () => {
  describe('handler', () => {
    it('saves new mapping', async () => {
      expect.assertions(1);

      const tryGetObjectJSON = jest.spyOn(s3Utils, 'tryGetObjectJSON');
      tryGetObjectJSON.mockResolvedValue({});

      const newMapping = {
        '/aws/lambda/my-stack-11-my_func_one': 'my-stack-11',
        '/aws/lambda/my-stack-11-my_func_two': 'my-stack-11',
        '/aws/lambda/my-stack-12-other_func_one': 'my-stack-12',
        '/aws/lambda/my-stack-12-other_func_two': 'my-stack-12',
      };

      const getLogGroupStackMapping = jest.spyOn(cfUtils, 'getLogGroupStackMapping');

      getLogGroupStackMapping.mockResolvedValue(newMapping);

      const putObjectJSON = jest.spyOn(s3Utils, 'putObjectJSON');
      putObjectJSON.mockImplementation(() => {});

      await handler();

      expect(putObjectJSON.mock.calls[0][1]).toStrictEqual(newMapping);
    });

    it('updates existing mapping', async () => {
      expect.assertions(1);

      const prevMapping = {
        '/aws/lambda/my-stack-11-my_func_one': 'my-stack-666',
        '/aws/lambda/my-stack-12-other_func_zero': 'my-stack-12',
      };

      const tryGetObjectJSON = jest.spyOn(s3Utils, 'tryGetObjectJSON');
      tryGetObjectJSON.mockResolvedValue(prevMapping);

      const newMapping = {
        '/aws/lambda/my-stack-11-my_func_one': 'my-stack-11',
        '/aws/lambda/my-stack-11-my_func_two': 'my-stack-11',
        '/aws/lambda/my-stack-12-other_func_one': 'my-stack-12',
        '/aws/lambda/my-stack-12-other_func_two': 'my-stack-12',
      };

      const getLogGroupStackMapping = jest.spyOn(cfUtils, 'getLogGroupStackMapping');

      getLogGroupStackMapping.mockResolvedValue(newMapping);

      const putObjectJSON = jest.spyOn(s3Utils, 'putObjectJSON');
      putObjectJSON.mockImplementation(() => {});

      await handler();

      expect(putObjectJSON.mock.calls[0][1]).toStrictEqual(Object.assign(prevMapping, newMapping));
    });
  });
});
