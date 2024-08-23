
const functions = require('@google-cloud/functions-framework');
const { Logging } = require('@google-cloud/logging');
const {PubSub} = require('@google-cloud/pubsub');

let coldStartedCors = false;
let invocation = 0;

functions.http('corsEnabledFunction',async (req, res) => {

  let traceId = '123'
  const startTime = Date.now();

  console.log(req.query)
  if (!coldStartedCors) {
    console.info("COLD START OCCURED IN CORSENABLEDFUNCTION .");
    coldStartedCors = true;
    
  }else{
    invocation+=1;
  }

  console.log(invocation)
  // longRunningTask();
  res.set('Access-Control-Allow-Origin', '*');
  
  // Preflight handling for CORS
  if (req.method === 'OPTIONS') {
    // Set methods and headers allowed from the request
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '3600'); // cache preflight response for 3600s
    res.status(204).send('');
  } else {
    // Handle actual request
    const endTime = Date.now();
    const executionTime = endTime-startTime
    
    traceId = req.query.traceId
    let invoke_time = Date.now()
    try {
      
      var response = await publish(traceId)
      console.log(response)
      // res.status(200).send({ response });
    } catch (error) {
      res.status(500).send({ error: error.message });
    }

     // Logging INFO
     const logging = new Logging();
     const log = logging.log('my-trace-log');
     const text = `CORSENABLEDFUNCTION, start: ${startTime}, end:${endTime}, execution: ${executionTime}, traceId: ${traceId}, http_invoke_time: ${req.query.invoke_time} ,invoke_time: ${invoke_time}`;
     const metadata = {
       resource: {
         type: 'cloud_function',
         labels: {
           function_name: "nodejs-http-function",
           region: "europe-west3",
           project_id: "deep-beanbag-395510"
         }
       },
       severity: 'INFO',
       trace: `projects/deep-beanbag-395510/traces/${traceId}`
     };
     const entry = log.entry(metadata, text);
     await log.write(entry);


    

    res.send(`traceId: ${traceId}, triggerStartTime: ${startTime}, runtime: javascript`+`, Number of invocation: ${invocation}`);
  }







  
});




function publish(traceId){
  return new Promise(async (resolve,reject)=>{

  const topicName = 'my-chain-topic';


    // Logging 
   
  const dataBuffer = Buffer.from(`traceId: ${traceId}` );
  const pubsub = new PubSub();  

  try {
    await pubsub.topic(topicName).publish(dataBuffer);
    console.log(`Message published to topic ${topicName}. TraceId: ${traceId}`);
    resolve(`Message published  ${Date.now()}, TraceId: ${traceId}`);
  } catch (err) {
    console.error(`Error publishing message: ${err.message}`);
    reject('Error publishing message');
  }

  })
  
}
