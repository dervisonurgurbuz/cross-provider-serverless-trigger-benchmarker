const axios = require('axios');
const schedule = require('node-schedule');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid'); 

const { Logging } = require('@google-cloud/logging');


const logFilePath = path.join(__dirname, 'request_log.ndjson');

const logToFile = (data) => {
  fs.appendFile(logFilePath, JSON.stringify(data) + '\n', (err) => {
    if (err) {
      console.error('Error writing to log file:', err.message);
    }
  });
};

const sendRequest = async (triggerType, invocation = 'cold', runtime = 'javascript') => {

  const traceId = uuidv4();
  const cloudFunctionUrl = `https://europe-west3-deep-beanbag-395510.cloudfunctions.net/nodejs-invoker-http-function?trigger=${triggerType}&traceId=${traceId}&runtime=${runtime}`;  
  
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
      error: {}
    };

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


const logging = new Logging({
  projectId: 'deep-beanbag-395510',  
});

const logName = 'my-trace-log';

async function readLogs(time = 0) {

  console.log('READING LOGS')

  const log = logging.log(logName);

  const now = new Date();

  let timeAgo = new Date(now.getTime() - 5 * 60 * 1000);

  if (time>0){
    timeAgo = new Date(now.getTime() - time);
  }
  const formattedMinutesAgo = timeAgo.toISOString();

  // Create a filter for the logs, including a time range
  const filter = `logName="projects/deep-beanbag-395510/logs/${logName}" AND timestamp>="${formattedMinutesAgo}" AND severity="INFO"`;

  // Options for the log read
  const options = {
    filter: filter,
    orderBy: 'timestamp desc',
  };

  const [entries] = await log.getEntries(options);

  const ndjsonEntries = entries.map(entry => JSON.stringify(entry)).join('\n') + '\n';

  // Append the log entries to a file in NDJSON format
  fs.appendFileSync('logs.ndjson', ndjsonEntries);

  console.log('Logs appended to logs.ndjson');
}



const triggerChain = async () => {
  let invoke_time = Date.now()
  const traceId = uuidv4();
  const cloudFunctionUrl = `https://europe-west3-deep-beanbag-395510.cloudfunctions.net/chain-nodejs-http-function?traceId=${traceId}&invoke_time=${invoke_time}`;  
  
  const requestTime =  Date.now();
  try {
    const response = await axios.get(cloudFunctionUrl);
    console.log(response.data)
  }catch(e){
    console.log(e)
  }


}



// EXPERIMENTAL SETUP 1: 

// const job = schedule.scheduleJob('*/30 * * * *', function(){
//   console.log(`Scheduled task to send request every 30 minutes.`);
//     // console.log('Sending request to Google Cloud Function...');
//     sendRequest('http')  
//     sendRequest('storage')
//     sendRequest('database') 
//     sendRequest('pubsub')  

//     //Waiting 2500 ms for warm invocation
//     setTimeout(() => {
//           sendRequest('http','warm')
//           sendRequest('storage','warm')
//           sendRequest('database','warm')
//           sendRequest('pubsub','warm')
//     }, 2500);
//     // waiting 3 min to finish execution and pull data
//     setTimeout(() => {
//       readLogs().catch(console.error);
//     }, 180000);
// });


// EXPERIMENTAL SETUP 2: DIFFERENT RUNTIMES



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
  
      setTimeout(() => {
        readLogs().catch(console.error);
      }, 180000);
  });


// EXPERIMENTAL SETUP 3: CHAIN OF FUNCTIONS

// const job = schedule.scheduleJob('*/30 * * * *', function(){
//   triggerChain()
//    setTimeout(() => {
//     triggerChain()
//   }, 5000);
//   setTimeout(() => {
//     readLogs().catch(console.error);
//   }, 180000);
  
// })