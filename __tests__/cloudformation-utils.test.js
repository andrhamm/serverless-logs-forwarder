import { cloudformation } from '../lib/aws-clients';
import * as utils from '../lib/cloudformation-utils';

jest.mock('../lib/aws-clients');

afterEach(() => { jest.resetAllMocks(); });

describe('cloudformation-utils', () => {
  describe('getStackNameForLogGroup', () => {
    it('finds the cloudformation stack name for the given logroup', async () => {
      expect.assertions(1);
      const logGroupName = '/aws/lambda/my-log-group-name';
      const expectedStackName = 'my-stack-name';

      cloudformation.describeStackResources = jest.fn();
      cloudformation.describeStackResources.mockReturnValueOnce({
        promise: () => ({
          StackResources: [
            { PhysicalResourceId: logGroupName, StackName: expectedStackName },
            { PhysicalResourceId: 'my-log-group-name', StackName: expectedStackName },
            { PhysicalResourceId: '/aws/lambda/other-log-group-name', StackName: 'other-stack-name' },
          ],
        }),
      });

      const result = await utils.getStackNameForLogGroup(logGroupName);

      expect(result).toBe(expectedStackName);
    });
  });

  describe('getLogGroupsForStack', () => {
    it('paginates to find the cloudwatch loggroups for the given stack', async () => {
      expect.assertions(1);
      const stackName = 'my-stack-name';
      const expectedLogGroupNames = [
        '/aws/lambda/my-log-group-name-1',
        '/aws/lambda/my-log-group-name-2',
        '/aws/lambda/my-log-group-name-3',
      ];

      const expectedArgs = {
        StackName: stackName,
      };

      cloudformation.listStackResources = jest.fn();
      cloudformation.listStackResources.mockReturnValueOnce({
        promise: () => ({
          NextToken: 'getLogGroupsForStackNextToken',
          StackResourceSummaries: [
            { PhysicalResourceId: expectedLogGroupNames[0], ResourceType: 'AWS::Logs::LogGroup' },
            { PhysicalResourceId: expectedLogGroupNames[1], ResourceType: 'AWS::Logs::LogGroup' },
            { PhysicalResourceId: 'other-resource-1', ResourceType: 'other-type-1' },
          ],
        }),
      }).mockReturnValueOnce({
        promise: () => ({
          StackResourceSummaries: [
            { PhysicalResourceId: expectedLogGroupNames[2], ResourceType: 'AWS::Logs::LogGroup' },
            { PhysicalResourceId: 'other-resource-2', ResourceType: 'other-type-2' },
          ],
        }),
      });

      const result = await utils.getLogGroupsForStack(expectedArgs, {
        logGroupNamePrefix: '/aws/lambda',
      });

      expect(result).toEqual(expectedLogGroupNames);
    });
  });

  describe('getLogGroupStackMapping', () => {
    it('finds all cloudwatch loggroups and their cloudformation stack', async () => {
      expect.assertions(1);

      const stackLogGroups = {
        'my-stack-1': [
          '/aws/lambda/my-stack-1-log-group-1',
          '/aws/lambda/my-stack-1-log-group-2',
        ],
        'my-stack-2': [
          '/aws/lambda/my-stack-2-log-group-1',
          '/aws/lambda/my-stack-2-log-group-2',
        ],
        'my-stack-3': [
          '/aws/lambda/my-stack-3-log-group-1',
        ],
        'my-stack-4': [],
      };

      const expectedMapping = Object.keys(stackLogGroups).reduce((accumulator, stackName) => {
        stackLogGroups[stackName].forEach((logGroup) => {
          accumulator[logGroup] = stackName;
        });

        return accumulator;
      }, {});

      jest.spyOn(utils, 'getLogGroupsForStack')
        .mockImplementation(stack => Promise.resolve(stackLogGroups[stack.StackName]));

      cloudformation.listStacks = jest.fn();
      cloudformation.listStacks.mockReturnValueOnce({
        promise: () => ({
          NextToken: 'getLogGroupStackMappingNextToken',
          StackSummaries: [
            { StackName: 'my-stack-1' },
            { StackName: 'my-stack-2' },
          ],
        }),
      }).mockReturnValueOnce({
        promise: () => ({
          StackSummaries: [
            { StackName: 'my-stack-3' },
            { StackName: 'my-stack-4' },
          ],
        }),
      });

      const result = await utils.getLogGroupStackMapping({
        logGroupNamePrefix: '/aws/lambda',
      });

      expect(result).toEqual(expectedMapping);
    });
  });
});
