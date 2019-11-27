import axios from 'axios';

const getDefaultIndexSettings = async (kibanaApiBase) => {
  const url = `${kibanaApiBase}/index-pattern/cloudwatchlogs-*`;

  const req = {
    method: 'get',
    url,
    headers: {
      'kbn-version': '5.0.1',
      'kbn-xsrf': 'cloudWatchlogs-*',
    },
  };

  const resp = await axios(req);

  // eslint-disable-next-line no-underscore-dangle
  return resp.data._source;
};

export const saveIndexPattern = async ({ stackName, stage, kibanaApiBase }) => {
  const defaultIndexSettings = await getDefaultIndexSettings(kibanaApiBase);

  const servicePrefix = new RegExp(`^(.*?)(?:-${stage})?$`, 'i').exec(stackName)[1];

  const indexPattern = `cloudwatchlogs-${servicePrefix}-*`;

  const url = `${kibanaApiBase}/index-pattern/${indexPattern}`;

  const req = {
    method: 'put',
    url,
    headers: {
      'kbn-version': '5.0.1',
      'kbn-xsrf': indexPattern,
    },
    data: {
      ...defaultIndexSettings,
      title: indexPattern,
    },
  };

  return axios(req);
};
