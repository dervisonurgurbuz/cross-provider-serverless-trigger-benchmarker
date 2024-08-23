const functions = require('@google-cloud/functions-framework');
const { Logging } = require('@google-cloud/logging');



// This code will be executed when the Pub/Sub trigger topic receives a message.
functions.cloudEvent('helloPubSub', async cloudEvent => { 

  const startTime = Date.now();
  const base64name = cloudEvent.data.message.data;

  const name = base64name
    ? Buffer.from(base64name, 'base64').toString()
    : 'World';

    const endTime = Date.now();
    let executionTime = endTime-startTime;
     // Logging INFO
     const logging = new Logging();
     const log = logging.log('my-trace-log');
     const text = `HELLOPUBSUB, start: ${startTime}, end:${endTime}, execution: ${executionTime},  ${name}`;
     const metadata = {
       resource: {
         type: 'cloud_function',
         labels: {
           function_name: "nodejs-pubsub-function",
           region: "europe-west3",
           project_id: "deep-beanbag-395510"
         }
       },
       severity: 'INFO',
       trace: `projects/deep-beanbag-395510/traces/${name}`
     };
     const entry = log.entry(metadata, text);
     await log.write(entry);
     

  console.log(`Hello, ${name}!`);
});
