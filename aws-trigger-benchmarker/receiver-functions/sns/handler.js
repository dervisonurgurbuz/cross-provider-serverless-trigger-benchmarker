'use strict';
const AWS = require('aws-sdk');
const cloudwatchlogs = new AWS.CloudWatchLogs();
const logGroupName = '/aws/lambda/shared-log-group';



// SNS: Simple Notification Service
module.exports.hello = async (event) => {
  let startTime = Date.now();

  // Saving custom logs to Cloud Watch

  const data = JSON.stringify(event); 
  await saveSharedLog(data,startTime);

  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: 'My SNS Lambda is working!',
        input: event,
      },
      null,
      2
    ),
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
