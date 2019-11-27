import zlib from 'zlib';

export const kinesisifyRecord = (data) => {
  const input = Buffer.from(JSON.stringify(data));

  const compressed = zlib.gzipSync(input);

  return {
    kinesis: {
      data: compressed.toString('base64'),
    },
  };
};

export const mockKinesisCloudWatchLogsEventRecords = [{
  logGroup: '/aws/lambda/my-stack-my_function',
  logStream: '2018/11/05/[$LATEST]a3a206b7b35f414f9f567242385ede8a',
  messageType: 'DATA_MESSAGE',
  logEvents: [
    {
      id: '1',
      extractedFields: {
        request_id: 1,
        event: 'message 1',
        timestamp: 1432826855000,
      },
    },
    {
      id: '2',
      extractedFields: {
        request_id: 2,
        event: 'message 2',
        timestamp: 1432826855000,
      },
    },
  ],
},
{
  logGroup: '/aws/lambda/my-stack-my_function',
  logStream: '2018/11/05/[$LATEST]a3a206b7b35f414f9f567242385ede8b',
  messageType: 'DATA_MESSAGE',
  logEvents: [
    {
      id: '3',
      extractedFields: {
        request_id: 3,
        event: JSON.stringify({ customField: 'custom field value' }),
        timestamp: 1432826855000,
      },
    },
    {
      id: '4',
      extractedFields: {
        request_id: 4,
        event: 'message 4',
        timestamp: 1432826855000,
      },
    },
  ],
},
{
  logGroup: '/aws/lambda/my-stack-my_function',
  logStream: '2018/11/05/[$LATEST]a3a206b7b35f414f9f567242385ede8a',
  messageType: 'CONTROL_MESSAGE',
},
{
  logGroup: '/aws/lambda/my-stack-my_function',
  logStream: '2018/11/05/[$LATEST]a3a206b7b35f414f9f567242385ede8b',
  messageType: 'CONTROL_MESSAGE',
}];
