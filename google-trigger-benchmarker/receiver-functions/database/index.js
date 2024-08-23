const functions = require('@google-cloud/functions-framework');
const protobuf = require('protobufjs');
const { Logging } = require('@google-cloud/logging');


functions.cloudEvent('helloFirestore', async cloudEvent => {
  const startTime = Date.now();
  try {


    console.log(`Function triggered by event on: ${cloudEvent.source}`);
    console.log(`Event type: ${cloudEvent.type}`);

    console.log('Loading protos...');
    const root = await protobuf.load('data.proto');
    const DocumentEventData = root.lookupType(
      'google.events.cloud.firestore.v1.DocumentEventData'
    );

    console.log('Decoding data...');
    const firestoreReceived = DocumentEventData.decode(cloudEvent.data);

    console.log('\nOld value:');
    console.log(JSON.stringify(firestoreReceived.oldValue, null, 2));
  
    console.log('\nNew value:');
    let data = JSON.stringify(firestoreReceived.value, null, 2)
    console.log(data);
    let parsedData = JSON.parse(data);
    endTime = Date.now()
    executionTime =  endTime-startTime
    // Logging INFO
    const logging = new Logging();
    const log = logging.log('my-trace-log');
    const text = `HELLOFIRESTORE, start: ${startTime}, end:${endTime}, execution: ${executionTime},  TraceId: ${parsedData.fields.traceId.stringValue}`;
    const metadata = {
      resource: {
        type: 'cloud_function',
        labels: {
          function_name: "nodejs-firebase-function",
          region: "europe-west3",
          project_id: "deep-beanbag-395510"
        }
      },
      severity: 'INFO',
      trace: `projects/deep-beanbag-395510/traces/${parsedData.fields.traceId.stringValue}`
    };
    const entry = log.entry(metadata, text);
    await log.write(entry);

  
    console.log(`Changes in Firestore: ${Date.now()}  ${cloudEvent.type} ${firestoreReceived.oldValue} ${ firestoreReceived.value} ${cloudEvent.source}`);

  } catch (error) {
    console.error('Error processing Firestore event:', error);
  }
});