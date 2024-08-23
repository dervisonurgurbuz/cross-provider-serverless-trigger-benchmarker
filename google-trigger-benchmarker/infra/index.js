// NodeJS Invocar function for different trigger types: The functions will be triggered through google cloud functions

const { Storage } = require('@google-cloud/storage');
const { GoogleAuth } = require('google-auth-library');
const {PubSub} = require('@google-cloud/pubsub');
const path = require('path');
const axios = require('axios')
const functions = require('@google-cloud/functions-framework');
const admin = require('firebase-admin');

const { Logging } = require('@google-cloud/logging');

const startTime = Date.now();

functions.http('triggerFunc',async (req, res) => {
  console.log(req.query)
  trigger = req.query.trigger
  traceId = req.query.traceId
  runtime = req.query.runtime

  let url = "https://europe-west3-deep-beanbag-395510.cloudfunctions.net/nodejs-http-function"
  if (!trigger) {
    return res.status(400).send('Undefined Trigger!!');
  }
  console.log(`Triggering: ${trigger} at ${new Date().toISOString()} with runtime: ${runtime}`)
  if(runtime == 'python'){
    //Running triggers in python
    let url = "https://europe-west3-deep-beanbag-395510.cloudfunctions.net/http-python"
    const auth = new GoogleAuth();
    const client = await auth.getIdTokenClient(url);
    const idToken = await client.idTokenProvider.fetchIdToken(url);
   
    var response = await sendRequest(url,idToken, req.query);
    response+=', runtime: python'
    res.status(200).json(response);
 

  }else if(runtime == 'java'){
    // Running triggers in java
    url = `https://europe-west3-deep-beanbag-395510.cloudfunctions.net/java-http-function`
    const auth = new GoogleAuth();
    const client = await auth.getIdTokenClient(url);
    const idToken = await client.idTokenProvider.fetchIdToken(url);
 
    var response = await sendRequest(url,idToken, req.query);
    response+=', runtime: java'
    res.status(200).json(response);
  }else{ 
    // Running triggers in javascript
    switch (trigger) {
      case 'http':
          const auth = new GoogleAuth();
          // let url = 'https://europe-west3-deep-beanbag-395510.cloudfunctions.net/function-test-v1'  // Hello world
          url = "https://europe-west3-deep-beanbag-395510.cloudfunctions.net/nodejs-http-function"
          const client = await auth.getIdTokenClient(url);
          const idToken = await client.idTokenProvider.fetchIdToken(url);
          //   sendRequest(url, res);
          var response = await sendRequest(url,idToken, req.query);
          // response+=' rutime: javascript'
          res.status(200).json(response);
          break;

      case 'storage':
          // Uploading file to bucket for triggering storage function
          
          try {
              var response = await uploadFile(traceId);
              res.status(200).send({ response });
          } catch (error) {
              res.status(500).send({ error: error.message });
          }

          break;
      case 'pubsub':
          // Publishing message to trigger pub-sub cloud function
          try {
            var response = await publish(traceId)
            res.status(200).send({ response });
          } catch (error) {
            res.status(500).send({ error: error.message });
          }
        
        break; 
      case 'database':
        try {
          var response = await editDatabase(traceId)
          res.status(200).send({ response });
        } catch (error) {
          res.status(500).send({ error: error.message });
        }
      default:
        res.status(400).send('Invalid action specified');
    }
  }  
 
});
 
// TRIGGER TYPE 1: HTTP
 
function sendRequest(url,idToken, queryParams) {
    return new Promise(async (resolve, reject) => {
    traceId = queryParams.traceId
    // Logging INFO
    const logging = new Logging();
    const log = logging.log('my-trace-log');
    const text = `infra_action: SENDREQUEST, start: ${Date.now()}, TraceId: ${traceId}`;
    const metadata = {
      resource: {
        type: 'cloud_function',
        labels: {
          function_name: "nodejs-invoker-http-function",
          region: "europe-west3",
          project_id: "deep-beanbag-395510"
        }
      },
      severity: 'INFO',
      trace: `projects/${process.env.GCP_PROJECT}/traces/${traceId}`
    };
    const entry = log.entry(metadata, text);
    await log.write(entry);



    queryParams.traceId = traceId
    infra_invoke_time = Date.now()
        axios.get(url, {  headers: {
          Authorization: `Bearer ${idToken}`
        },params: queryParams })
          .then(response => {
            resolve(response.data +  `, infra_invoke_time:`+infra_invoke_time);
          })
          .catch(error => {
            reject(new Error('There was a problem with the Axios request:'+ error.message));
          });
      });
}


// // // TIGGER 2: UPLOADING FILE TO BUCKET

function uploadFile(traceId) {
    return new Promise(async (resolve, reject) => {


        // Logging INFO
        const logging = new Logging();
        const log = logging.log('my-trace-log');
        const text = `infra_action: UPLOADFILE, start: ${Date.now()}, TraceId: ${traceId}`;
        const metadata = {
          resource: {type: 'cloud_function'}, 
          severity: 'INFO',
        };
        const entry = log.entry(metadata, text);
        await log.write(entry);
       
      const storage = new Storage();
  
      const bucketName = 'my-trigger-storage';
 
      const filePath = path.join(__dirname, 'upload_text.txt');

      const destFileName = `${traceId}.txt`;
  
      storage.bucket(bucketName).upload(filePath, {
        destination: destFileName,
      })
      .then(() => {
        console.log(`${filePath} uploaded to ${bucketName}/${destFileName}`);
        resolve(`${filePath} uploaded to ${bucketName}/${destFileName}`);
      })
      .catch(error => {
        console.error('Error uploading file:', error);
        reject(new Error('Error uploading file: ' + error.message));
      });
    });
}
  

// TRIGGER 3: Pub-Sub Trigger

function publish(traceId){
  return new Promise(async (resolve,reject)=>{

  const topicName = 'my-gcs-topic';

    // Logging INFO
    const logging = new Logging();
    const log = logging.log('my-trace-log');
    const text = `infra_action: PUBLISH, start: ${Date.now()}, TraceId: ${traceId}`;
    const metadata = {
      resource: {type: 'cloud_function'}, 
      severity: 'INFO',
    };
    const entry = log.entry(metadata, text);
    await log.write(entry);

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

// Setting Up Database for editDatabase Function
// The Database Connection Has To Be Done Prior Because It Could not be connect everytime
const serviceAccountPath = './deep-beanbag-395510-35ed4ff9215b.json';
const serviceAccount = require(serviceAccountPath);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://deep-beanbag-395510.firebaseio.com' 
});

// Initialize Firestore
const db = admin.firestore();

const documentId = 'xrFXDdPmE2Wp3Ske2Kjn';  
const userRef = db.collection('users').doc(documentId);
 
function editDatabase(traceId) {
  return new Promise(async (resolve, reject) => { 

    try { 
    // Logging INFO
    const logging = new Logging();
    const log = logging.log('my-trace-log');
    const text = `infra_action: EDITDATABASE, start: ${Date.now()}, TraceId: ${traceId}`;
    const metadata = {
      resource: {type: 'cloud_function'}, 
      severity: 'INFO',
    };
    const entry = log.entry(metadata, text);
    await log.write(entry);
 
  // Log the update
  console.log(`Updating traceId for document ID: ${documentId} to ${traceId}`);

  // Update the traceId in table
  await userRef.update({
    traceId: traceId,
  });

   
  resolve(`${traceId} updated successfully`)

  } catch (error) {
    reject('Error processing Firestore event:', error);
  }

  })
}

