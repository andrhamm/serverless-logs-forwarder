import PQueue from 'p-queue';

import { cloudformation } from '../lib/aws-clients';

export const getStackNameForLogGroup = async (logGroupName) => {
  let data;
  try {
    data = await cloudformation.describeStackResources({
      PhysicalResourceId: logGroupName,
    }).promise();
  } catch (e) {
    if (e.message === `Stack for ${logGroupName} does not exist`) {
      return null;
    }

    throw e;
  }

  const resource = data.StackResources.find(r => r.PhysicalResourceId === logGroupName);
  return resource && resource.StackName ? resource.StackName : null;
};

export const getLogGroupsForStack = async (stack, { logGroupNamePrefix }) => {
  const params = {
    StackName: stack.StackName,
    // NextToken: 'STRING_VALUE',
  };

  const allLogGroups = [];

  let data;
  do {
    // eslint-disable-next-line no-await-in-loop
    data = await cloudformation.listStackResources(params).promise();

    const logGroups = data.StackResourceSummaries.filter(r => r.ResourceType === 'AWS::Logs::LogGroup' && r.PhysicalResourceId.startsWith(logGroupNamePrefix));

    allLogGroups.push(...logGroups);

    params.NextToken = data.NextToken;
  } while (params.NextToken);

  return allLogGroups.map(r => r.PhysicalResourceId);
};

export const STACK_STATUS_FILTER = [
  'CREATE_IN_PROGRESS',
  'CREATE_FAILED',
  'CREATE_COMPLETE',
  'ROLLBACK_IN_PROGRESS',
  'ROLLBACK_FAILED',
  'ROLLBACK_COMPLETE',
  'DELETE_IN_PROGRESS',
  'DELETE_FAILED',
  // 'DELETE_COMPLETE',
  'UPDATE_IN_PROGRESS',
  'UPDATE_COMPLETE_CLEANUP_IN_PROGRESS',
  'UPDATE_COMPLETE',
  'UPDATE_ROLLBACK_IN_PROGRESS',
  'UPDATE_ROLLBACK_FAILED',
  'UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS',
  'UPDATE_ROLLBACK_COMPLETE',
  'REVIEW_IN_PROGRESS',
];

export const getLogGroupStackMapping = async (opts) => {
  const params = {
    // NextToken: 'STRING_VALUE',
    StackStatusFilter: STACK_STATUS_FILTER,
  };

  const queue = new PQueue({ concurrency: 4 });

  const mapping = {};

  let data;
  do {
    // eslint-disable-next-line no-await-in-loop
    data = await cloudformation.listStacks(params).promise();

    data.StackSummaries.forEach((stack) => {
      queue.add(() => exports.getLogGroupsForStack(stack, {
        logGroupNamePrefix: opts.logGroupNamePrefix,
      })).then((logGroups) => {
        logGroups.forEach((logGroup) => {
          mapping[logGroup] = stack.StackName;
        });
      });
    });

    params.NextToken = data.NextToken;
  } while (params.NextToken);

  await queue.onIdle();

  return mapping;
};
