const AWS = require('aws-sdk');
const { unmarshall } = AWS.DynamoDB.Converter;

const cloudwatchlogs = new AWS.CloudWatchLogs();
const logGroupName = '/aws/lambda/shared-log-group';


module.exports.logChanges = async (event) => {
  let startTime = Date.now();
  
  const data = JSON.stringify(event);
  
  await saveSharedLog(data,startTime);

  event.Records.forEach(record => {
    const parsedNewImage = record.dynamodb.NewImage ? unmarshall(record.dynamodb.NewImage) : null;

    if (record.eventName === 'INSERT') {
      console.log(`Epoch startTime: ${startTime} New item added:`, JSON.stringify(parsedNewImage, null, 2));
    } else if (record.eventName === 'MODIFY') {
      console.log({
        traceId: parsedNewImage ? parsedNewImage.userId : 'Unknown',
        startTime
      });
      console.log(`Epoch startTime: ${startTime} Modified item:`, JSON.stringify(parsedNewImage, null, 2));
    }
  });

  return { message: 'Successfully processed DynamoDB stream event.', event };
};

async function saveSharedLog(data,startTime) {
  const logStreamName = `logStream-${Date.now()}`;
  
  try {
    // Create a log stream
    await cloudwatchlogs.createLogStream({
      logGroupName,
      logStreamName
    }).promise();
  } catch (error) {
    if (error.code !== 'ResourceAlreadyExistsException') {
      console.error('Error creating log stream:', error);
      throw error;
    }
  }

  // Put log events
  try {
    await cloudwatchlogs.putLogEvents({
      logGroupName,
      logStreamName,
      logEvents: [
        {
          timestamp: startTime,
          message: data
        }
      ]
    }).promise();
  } catch (error) {
    console.error('Error putting log events:', error);
    throw error;
  }
}
