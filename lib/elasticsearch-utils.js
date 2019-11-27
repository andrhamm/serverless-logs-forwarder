import elasticsearch from 'elasticsearch';

export const client = opts => new elasticsearch.Client({
  // log: 'trace', // uncomment for debug logging
  apiVersion: '5.6',
  protocol: 'http',
  requestTimeout: 6000,
  ...opts,
});
