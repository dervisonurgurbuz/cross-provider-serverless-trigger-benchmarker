 
const functions = require('@google-cloud/functions-framework');
const { Logging } = require('@google-cloud/logging');

const startTime = Date.now()
 
// This code will be executed when the something uploeaded in bucket.
functions.cloudEvent('helloGCS', async cloudEvent => {
  const startTime = Date.now()
  console.log("Triggered GCF")
  console.log(typeof(cloudEvent))
  console.log(cloudEvent) 
  
  console.log(`Event ID: ${cloudEvent.id}`);
  console.log(`Event Type: ${cloudEvent.type}`);

  const file = cloudEvent.data;
  console.log(`Bucket: ${file.bucket}`);
  console.log(`File: ${file.name}`);
  console.log(`Metageneration: ${file.metageneration}`);
  console.log(`Created: ${file.timeCreated}`);
  console.log(`Updated: ${file.updated}`);

  endTime = Date.now()
    executionTime =  endTime-startTime
    // Logging INFO
    const logging = new Logging();
    const log = logging.log('my-trace-log');
    const text = `HELLOGCS, start: ${startTime}, end:${endTime}, execution: ${executionTime},  TraceId: ${file.name.slice(0, -4)}`;
    const metadata = {
      resource: {
        type: 'cloud_function',
        labels: {
          function_name: "nodejs-storage-function",
          region: "europe-west3",
          project_id: "deep-beanbag-395510"
        }
      },
      severity: 'INFO',
      trace: `projects/deep-beanbag-395510/traces/${file.name.slice(0, -3)}`
    };
    const entry = log.entry(metadata, text);
    await log.write(entry);

}); 

  