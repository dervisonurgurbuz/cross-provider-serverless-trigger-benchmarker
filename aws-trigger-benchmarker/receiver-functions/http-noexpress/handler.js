
const AWS = require('aws-sdk');

const cloudwatchlogs = new AWS.CloudWatchLogs();
const logGroupName = '/aws/lambda/shared-log-group';


exports.hello = async (event) => {
  let startTime = Date.now();
  console.log(event);
  
  const data = JSON.stringify(event);
  
  await saveSharedLog(data,startTime);

  
  const traceId = event.queryStringParameters ? event.queryStringParameters.traceId : null;
  const currentTime = new Date().toISOString();

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: `traceId: ${traceId} , triggerStartTime: ${startTime}, runtime: javascript`,
      traceIdHttp: traceId,
      currentTime: currentTime,
    }),
  };
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
