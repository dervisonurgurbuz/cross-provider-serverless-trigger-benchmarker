
const functions = require('@google-cloud/functions-framework');
const { Logging } = require('@google-cloud/logging');



let coldStartedCors = false;
let invocation = 0;

functions.http('corsEnabledFunction',async (req, res) => {
  const startTime = Date.now();

  console.log(req.query)
  if (!coldStartedCors) {
    console.info("COLD START OCCURED IN CORSENABLEDFUNCTION .");
    coldStartedCors = true;
    
  }else{
    invocation+=1;
  }

  console.log(invocation) 
  res.set('Access-Control-Allow-Origin', '*');
  
  // Handling possible CORS Errors
  if (req.method === 'OPTIONS') {
  
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '3600');  
    res.status(204).send('');
  } else {

    const endTime = Date.now();
    const executionTime = endTime-startTime
    
    traceId = req.query.traceId

     // Logging INFO
     const logging = new Logging();
     const log = logging.log('my-trace-log');
     const text = `CORSENABLEDFUNCTION, start: ${startTime}, end:${endTime}, execution: ${executionTime}, TraceId: ${traceId}`;
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
