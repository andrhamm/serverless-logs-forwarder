import * as kms from '../lib/kms-utils';
import * as common from '../lib/common';

jest.mock('../lib/kms-utils');

afterEach(() => { jest.resetAllMocks(); });

describe('common', () => {
  describe('tryParseJson', () => {
    it('returns null for invalid json', () => {
      expect(common.tryParseJson('[')).toBeNull();
    });

    it('returns parsed json', () => {
      const obj = { foo: 'bar' };
      expect(common.tryParseJson(JSON.stringify(obj))).toEqual(obj);
    });
  });

  describe('fromEntries', () => {
    it('returns an object consisting of the entries provided', () => {
      const obj = {
        foo: 'bar',
        hello: 'world',
        1: 2,
        3: 4,
      };

      expect(common.fromEntries(Object.entries(obj))).toStrictEqual(obj);
    });
  });

  describe('getEnv', () => {
    beforeAll(() => {
      process.env.MY_VAR_ENCRYPTED = 'asdfasdfasdfasdf';
      process.env.OTHER_VAR_PLAINTEXT = 'zxcvzxcvzxcv';
    });

    afterAll(() => {
      delete process.env.MY_VAR_ENCRYPTED;
      delete process.env.OTHER_VAR_PLAINTEXT;
    });

    it('calls decrypt on environment vars with keys ending with \'_encrypted\'', () => {
      const spy = jest.spyOn(kms, 'decryptSecrets');
      spy.mockResolvedValue(['decrypted']);

      common.getEnv([
        'MY_VAR_ENCRYPTED',
        'OTHER_VAR_PLAINTEXT',
      ]);

      expect(spy).toHaveBeenCalledWith([process.env.MY_VAR_ENCRYPTED]);
    });

    it('returns object including decrypted keys', async () => {
      expect.assertions(1);

      const spy = jest.spyOn(kms, 'decryptSecrets');
      spy.mockResolvedValue(['decrypted']);

      const env = await common.getEnv([
        'MY_VAR_ENCRYPTED',
        'OTHER_VAR_PLAINTEXT',
      ]);

      expect(env).toEqual({
        MY_VAR_ENCRYPTED: process.env.MY_VAR_ENCRYPTED,
        OTHER_VAR_PLAINTEXT: process.env.OTHER_VAR_PLAINTEXT,
        MY_VAR: 'decrypted',
      });
    });
  });
});
