import { sns } from '../lib/aws-clients';

const { SNS_TOPIC_ARN_LOGGROUP_EVENTS } = process.env;

export const handler = async (event) => {
  await sns.publish({
    Message: JSON.stringify(event),
    TopicArn: SNS_TOPIC_ARN_LOGGROUP_EVENTS,
  }).promise();
};
