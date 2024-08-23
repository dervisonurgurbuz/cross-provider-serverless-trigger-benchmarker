
const AWS = require('aws-sdk');
const sns = new AWS.SNS();
const cloudwatchlogs = new AWS.CloudWatchLogs();
const logGroupName = '/aws/lambda/shared-log-group';


exports.hello = async (event) => {
  let startTime = Date.now();
  console.log(event);
   
  const traceId = event.queryStringParameters ? event.queryStringParameters.traceId : null;
  const invocation = event.queryStringParameters ? event.queryStringParameters.invocation : null;
  const currentTime = new Date().toISOString();
  const topicArn = 'arn:aws:sns:eu-west-3:199287124841:myChainTopic'; 
  const message = `${traceId}`;
  const sns_invoke_time = Date.now()
  const resonse = await publishMessage(topicArn, message);
  console.log('Message published successfully:', resonse);

  // event.sns_invoke_time = sns_invoke_time
  let data = event;
  data.invoke_time =sns_invoke_time

  await saveSharedLog(JSON.stringify(data),startTime);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: `traceId: ${traceId} , triggerStartTime: ${startTime}, runtime: javascript, invocation = ${invocation}`,
      traceIdHttp: traceId,
      currentTime: currentTime,
    }),
  };
};


async function saveSharedLog(data,startTime) {
  const logStreamName = `http-chain-logStream-${Date.now()}`;
  
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


// Function to publish message to SNS
const publishMessage = (topicArn, message) => {
  const params = {
    TopicArn: topicArn,
    Message:  JSON.stringify(message),
  };

  return sns.publish(params).promise();
};

