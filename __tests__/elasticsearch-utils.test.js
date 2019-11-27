/* eslint-disable
  import/no-extraneous-dependencies, no-unused-vars, global-require, no-underscore-dangle */
import AWS from 'aws-sdk';
import { client } from '../lib/elasticsearch-utils';

afterEach(() => { jest.resetAllMocks(); });

describe('elasticsearch-utils', () => {
  describe('esClient', () => {
    it('sets httpAuth', () => {
      const es = client({
        httpAuth: 'foobar',
      });

      expect(es.transport._config.httpAuth).toEqual('foobar');
    });

    it('sets host', () => {
      const es = client({
        host: 'foobar',
      });

      expect(es.transport._config.host).toEqual('foobar');
    });
  });
});
