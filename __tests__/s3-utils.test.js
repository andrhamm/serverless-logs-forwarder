import { s3 } from '../lib/aws-clients';
import * as utils from '../lib/s3-utils';

jest.mock('../lib/aws-clients');

afterEach(() => { jest.resetAllMocks(); });

describe('s3-utils', () => {
  describe('tryGetObjectJSON', () => {
    it('returns empty object if no mapping exists in s3', async () => {
      expect.assertions(1);

      s3.getObject = jest.fn();
      s3.getObject.mockReturnValueOnce({
        promise: () => {
          const err = new Error();
          err.code = 'NoSuchKey';
          throw err;
        },
      });

      const result = await utils.tryGetObjectJSON({
        Bucket: 'my-bucket',
        Key: 'my-key',
      });

      expect(result).toEqual({});
    });

    it('parses mapping as json', async () => {
      expect.assertions(1);

      const expectedResult = { foo: 'bar' };

      s3.getObject = jest.fn();
      s3.getObject.mockReturnValueOnce({
        promise: () => ({
          Body: JSON.stringify(expectedResult),
        }),
      });

      const result = await utils.tryGetObjectJSON({
        Bucket: 'my-bucket',
        Key: 'my-key',
      });

      expect(result).toEqual(expectedResult);
    });

    it('returns empty object if mapping is not valid json', async () => {
      expect.assertions(1);

      s3.getObject = jest.fn();
      s3.getObject.mockReturnValueOnce({
        promise: () => ({
          Body: '[',
        }),
      });

      const result = await utils.tryGetObjectJSON({
        Bucket: 'my-bucket',
        Key: 'my-key',
      });

      expect(result).toEqual({});
    });
  });

  describe('putMapping', () => {
    it('stringifies given mapping as json', async () => {
      expect.assertions(1);

      const mapping = { foo: 'bar' };

      s3.putObject = jest.fn();
      s3.putObject.mockReturnValueOnce({
        promise: () => ({}),
      });

      await utils.putObjectJSON({
        Bucket: 'my-bucket',
        Key: 'my-key',
      }, mapping);

      expect(s3.putObject).toBeCalledWith(
        expect.objectContaining({ Body: JSON.stringify(mapping) }),
      );
    });
  });
});
