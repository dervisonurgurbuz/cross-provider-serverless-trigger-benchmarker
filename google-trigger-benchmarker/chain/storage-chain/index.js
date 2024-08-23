const functions = require('@google-cloud/functions-framework');
const admin = require('firebase-admin');
const { Logging } = require('@google-cloud/logging');

// Initializing Firebase Admin SDK
const serviceAccountPath = './deep-beanbag-395510-35ed4ff9215b.json';
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://deep-beanbag-395510.firebaseio.com'
});

// Initializing Firestore
const db = admin.firestore();
const documentId = 'xrFXDdPmE2Wp3Ske2Kjn';  
const userRef = db.collection('users').doc(documentId);

// Define the Cloud Function
functions.cloudEvent('helloGCS', async cloudEvent => {
  const startTime = Date.now();
  console.log("Triggered GCF");
  console.log(typeof cloudEvent);
  console.log(cloudEvent);

  const { id, type, data: file } = cloudEvent;
  console.log(`Event ID: ${id}`);
  console.log(`Event Type: ${type}`);
  console.log(`Bucket: ${file.bucket}`);
  console.log(`File: ${file.name}`);
  console.log(`Metageneration: ${file.metageneration}`);
  console.log(`Created: ${file.timeCreated}`);
  console.log(`Updated: ${file.updated}`);

  const endTime = Date.now();
  const executionTime = endTime - startTime;


  let invoke_time = Date.now()
  try {
    await editDatabase(file.name.slice(0, -4));
  } catch (e) {
    console.error('Error updating database:', e);
  }

  // Logging 
  const logging = new Logging();
  const log = logging.log('my-trace-log');
  const text = `HELLOGCS, start: ${startTime}, end: ${endTime}, execution: ${executionTime},  ${file.name.slice(0, -4)}, invoke_time: ${invoke_time}`;
  const metadata = {
    resource: {
      type: 'cloud_function',
      labels: {
        function_name: "chain-nodejs-storage-function",
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

async function editDatabase(traceId) {
  try {

  
    console.log(`Updating traceId for document ID: ${documentId} to ${traceId}`);

    await userRef.update({ traceId });

    console.log(`${traceId} updated successfully`);
  } catch (error) {
    console.error('Error processing Firestore event:', error);
  }
}
