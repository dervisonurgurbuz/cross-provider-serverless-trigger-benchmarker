const AWS = require('aws-sdk');
const s3 = new AWS.S3();

const cloudwatchlogs = new AWS.CloudWatchLogs();
const logGroupName = '/aws/lambda/shared-log-group';


module.exports.s3Handler = async (event) => {

  let startTime = Date.now();

  const bucket = event.Records[0].s3.bucket.name;
  const key = event.Records[0].s3.object.key;

  const data = JSON.stringify(event);
  await saveSharedLog(data,startTime);

  try {
    // Return the file name
    const fileName = key;
    console.log(`Stored file name: ${fileName} triggerStartTime: ${startTime}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ fileName: fileName , startTime: startTime}),
    };
  } catch (err) {
    console.error(`Error processing object ${key} from bucket ${bucket}.`, err);
    throw err;
  }
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
