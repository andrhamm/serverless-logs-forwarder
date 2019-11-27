import { cloudWatchLogs } from './aws-clients';

export const subscribe = ({ logGroupName, roleArn, destinationArn }) =>
  cloudWatchLogs.putSubscriptionFilter({
    destinationArn,
    roleArn,
    logGroupName,
    filterName: 'ship-logs',
    filterPattern: '[timestamp=*Z, request_id="*-*", event]',
  }).promise();

export const getLogGroup = async (logGroupName) => {
  const params = {
    logGroupNamePrefix: logGroupName,
    // nextToken: 'STRING_VALUE',
  };

  let data;
  do {
    // eslint-disable-next-line no-await-in-loop
    data = await cloudWatchLogs.describeLogGroups(params).promise();

    const logGroup = data.logGroups.find(result => result.logGroupName === logGroupName);

    if (logGroup) return logGroup;

    params.nextToken = data.nextToken;
  } while (params.nextToken);

  return {};
};

export const logGroupGetTag = async (logGroupName, tagName) => {
  const tagsResp = await cloudWatchLogs.listTagsLogGroup({ logGroupName }).promise();
  const tags = tagsResp.tags || {};

  return tags[tagName];
};

export const setExpiry = ({ logGroupName, retentionInDays }) =>
  cloudWatchLogs.putRetentionPolicy({
    logGroupName,
    retentionInDays,
  }).promise();

export const getExpiry = async (logGroupName) => {
  const logGroup = await exports.getLogGroup(logGroupName);
  return logGroup.retentionInDays;
};
