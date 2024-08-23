const axios = require('axios');
const schedule = require('node-schedule');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const AWS = require('aws-sdk');


// Initialize the CloudWatchLogs client
const cloudwatchlogs = new AWS.CloudWatchLogs({ region: 'eu-west-3' });

// Log file path for Sent requests
const logFilePath = path.join(__dirname, 'request_log.ndjson');

// Function to log data to a file in NDJSON format
const logToFile = (data) => {
  fs.appendFile(logFilePath, JSON.stringify(data) + '\n', (err) => {
    if (err) {
      console.error('Error writing to log file:', err.message);
    }
  });
};

// Function to send an HTTP request
const sendRequest = async (triggerType, invocation = 'cold', runtime = undefined) => {
  const traceId = uuidv4();
  const cloudFunctionUrl = `https://5hinh2ug06.execute-api.eu-west-3.amazonaws.com?trigger=${triggerType}&traceId=${traceId}&runtime=${runtime}`;  
  const requestTime =  Date.now();
  try {
    const response = await axios.get(cloudFunctionUrl);
    const responseTime = Date.now();
    const logEntry = {
        triggerType,
        TraceId: traceId,
        invocation,
        requestTime,
        requestTimestring: new Date(requestTime).toISOString(),
        responseTime: new Date(responseTime).toISOString(),
      requestDelta:responseTime-requestTime, //milliseconds
      status: response.status,
      data: response.data
    };
    console.log(logEntry);
    logToFile(logEntry);
  } catch (error) {
    const responseTime = Date.now();
    const logEntry = {
        triggerType,
        TraceId: traceId,
        invocation,
        requestTime: new Date(requestTime).toISOString(),
        responseTime: new Date(responseTime).toISOString(),
      requestDelta:responseTime-requestTime, //milliseconds
      status: `Error: ${error}`,
     
    };
    console.log(error)
    if (error.response) {
      logEntry.error.status = error.response.status;
      logEntry.error.data = error.response.data;
    } else if (error.request) {
      logEntry.error.request = error.request;
    } else {
      logEntry.error.message = error.message;
    }
    console.error(logEntry);
    logToFile(logEntry);
  }
};




// Function to filter log events
const filterLogEvents = async (time = 0) => {
  console.log('READING LOGS')

  // Calculate the time range
  const endTime = Date.now();
  let startTime = endTime - 300000;
  if(time>0){
    startTime = endTime - time; // unique time window
  }
  // Define parameters for the filterLogEvents method
  const params = {
    logGroupName: '/aws/lambda/shared-log-group',
    startTime: startTime,
    endTime: endTime,
    // limit: 100,
  };

  try {
    const data = await cloudwatchlogs.filterLogEvents(params).promise();
    console.log(data)
    console.log('Filtered log events:', data.events);

    // Append logs to NDJSON file
    const filePath = path.join(__dirname, 'logs.ndjson');
    const ndjsonLogs = data.events.map(event => extractRelevantInfo(event)).filter(event => event).map(event => JSON.stringify(event)).join('\n') + '\n';
    fs.appendFileSync(filePath, ndjsonLogs, 'utf8');
    console.log('Logs appended to logs.ndjson');
  } catch (error) {
    console.error('Error filtering log events:', error);
  }

};




// console.log(`Scheduled task to send request every 5 minutes.`);


// Function to extract relevant information from log events
const extractRelevantInfo = (event) => {
  try {
    const message = JSON.parse(event.message);
    triggerStartTime = event.timestamp
    if (message.Records) {
      const record = message.Records[0];
      
      switch (record.EventSource || record.eventSource) {  // Handle case sensitivity
        case 'aws:s3':
          return {
            eventType: 'Storage',
            bucket: record.s3.bucket.name,
            objectKey: record.s3.object.key,
            eventTime: record.eventTime,
            sourceIPAddress: record.requestParameters.sourceIPAddress,
            userIdentity: record.userIdentity.principalId,
            triggerStartTime: triggerStartTime,
            TraceId: record.s3.object.key.replace('uploads/', '').replace('.txt', ''),
            invoke_time :  message.invoke_time ?  message.invoke_time: undefined
          };
        case 'aws:sns':
          return {
            eventType: 'SNS',
            messageId: record.Sns.MessageId,
            topicArn: record.Sns.TopicArn,
            message: record.Sns.Message,
            timestamp: record.Sns.Timestamp,
            triggerStartTime: triggerStartTime,
            TraceId: record.Sns.Message,  // Extract traceId from the SNS message or any appropriate field
            invoke_time :  message.invoke_time ?  message.invoke_time: undefined
          };
        case 'aws:dynamodb':
          // let traceId = String(record.dynamodb.NewImage.name.S)
          // traceId = traceId.slice(0, -3);
          return {
            eventType: 'Database',
            eventID: record.eventID,
            eventName: record.eventName,
            keys: record.dynamodb.Keys,
            newImage: record.dynamodb.NewImage,
            eventSourceARN: record.eventSourceARN,
            triggerStartTime: triggerStartTime,
            TraceId: record.dynamodb.NewImage.name.S // Extract traceId from the DynamoDB new image or any appropriate field
          };
      }
    } else if (message.version) {
      return {
        eventType: 'HTTP',
        method: message.requestContext.http.method,
        path: message.requestContext.http.path,
        sourceIp: message.requestContext.http.sourceIp,
        userAgent: message.requestContext.http.userAgent,
        queryStringParameters: message.queryStringParameters,
        triggerStartTime: triggerStartTime,
        TraceId: message.queryStringParameters.traceId,  // Extract traceId from the HTTP query parameters or any appropriate field
        invoke_time: message.invoke_time ? message.invoke_time : undefined  // Makes sns_invoke_time optional
      };
    }
  } catch (error) {
    console.error('Error parsing log message:', error);
  }
  return null; 
};




const triggerChain = async (triggerType="http", invocation = 'cold', runtime = 'javascript') => {
  const traceId = uuidv4();
  const invoke_time =  Date.now();
 
  
    
  const cloudFunctionUrl = `https://0n4mex3v37.execute-api.eu-west-3.amazonaws.com?trigger=${triggerType}&traceId=${traceId}&runtime=${runtime}&invoke_time=${invoke_time}&invocation=${invocation}`;  

  try {
    const response = await axios.get(cloudFunctionUrl);
    const logEntry = {
      triggerType,
      TraceId: traceId,
      invocation,
      invokeTimeString: new Date(invoke_time).toISOString(),
      invokeTime: new Date(invoke_time).toISOString(),
    status: response.status,
    data: response.data
    };
    console.log(logEntry);
    logToFile(logEntry);
    // console.log(response)
  }catch(e){
    console.log(e)
  }
}




// Experimental Setup 1: AWS TRIGGERS
 
// // Schedule the request to run every 30 minutes
// const job = schedule.scheduleJob('*/30 * * * *', function(){
//   console.log(`Scheduled task to send request every 30 minutes.`);
    
//     sendRequest('http')  
//     sendRequest('storage')
//     sendRequest('database') 
//     sendRequest('sns')  

//     //Waiting 2500 ms for warm invocation
//     setTimeout(() => {
//           sendRequest('http','warm')
//           sendRequest('storage','warm')
//           sendRequest('database','warm')
//           sendRequest('sns','warm')
//     }, 2500);

//     setTimeout(() => {
//       filterLogEvents().catch(console.error);
//     }, 10000);
// });

// EXPERIMENTAL SETUP 2: RUNTIME


// sendRequest('http',"warm",'javascript')
// sendRequest('http',"warm",'python')
// sendRequest('http',"warm",'java')

const job = schedule.scheduleJob('*/30 * * * *', function(){
  console.log(`Scheduled task to send request every 30 minutes.`);
    // console.log('Sending request to Google Cloud Function...');
    sendRequest('http', undefined,'javascript')  
    sendRequest('http',undefined, 'python')  
    sendRequest('http',undefined, 'java')  

    //Waiting 2500 ms for warm invocation
    setTimeout(() => {
      sendRequest('http', 'warm','javascript')  
      sendRequest('http','warm', 'python')  
      sendRequest('http','warm', 'java')  
    }, 2500);

   
});


// EXPERIMENTAL SETUP 3: CHAIN OF FUNCTIONS Cold Start


// const job = schedule.scheduleJob('*/30 * * * *', function(){
//   triggerChain()
//   setTimeout(() => {
//     triggerChain(undefined, 'warm');
//         }, 5000);

//   setTimeout(() => {
//   filterLogEvents().catch(console.error); 
//      }, 15000);
// })
