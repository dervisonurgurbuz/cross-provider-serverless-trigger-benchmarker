'use strict';
const AWS = require('aws-sdk');
const region = process.env.AWS_REGION || 'eu-west-3'; 
AWS.config.update({ region: region });
const cloudwatchlogs = new AWS.CloudWatchLogs();
const logGroupName = '/aws/lambda/shared-log-group';

const s3 = new AWS.S3(); 



module.exports.hello = async (event) => {
  let startTime = Date.now();
  const traceId = event.Records[0].Sns.Message.replace(/^"|"$/g, '')
  console.log(traceId)
 
  const bucketName = 'mybucket-triggerbench-chain'; 
  const fileName = `uploads/${traceId}.txt`; 
  const fileContent = 'Sample text content'; 

  const params = {
    Bucket: bucketName,
    Key: fileName,
    Body: fileContent,
    ContentType: 'text/plain'
  };
  const storage_invoke_time = Date.now()
  const response = await s3.upload(params).promise();
  console.log(response)
  // Saving custom logs to Cloud Watch

  let data = event
  data.invoke_time =storage_invoke_time
  await saveSharedLog(JSON.stringify(data),startTime);
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
  const logStreamName = `sns-chain-logStream-${Date.now()}`;
  
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
