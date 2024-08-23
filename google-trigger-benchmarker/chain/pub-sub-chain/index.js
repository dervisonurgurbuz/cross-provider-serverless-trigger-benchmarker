const functions = require('@google-cloud/functions-framework');
const { Logging } = require('@google-cloud/logging');
const { Storage } = require('@google-cloud/storage');


functions.cloudEvent('helloPubSub', async cloudEvent => {


  const startTime = Date.now();
  const base64name = cloudEvent.data.message.data;

  const name = base64name
    ? Buffer.from(base64name, 'base64').toString()
    : 'World';

    const endTime = Date.now();
    let executionTime = endTime-startTime;
   

    let invoke_time = Date.now()
     try {
      
      var response = await uploadFile(name);
      console.log(response)
  } catch (error) {
      console.log(error)
    }
  console.log(`Hello, ${name}!`);

    // Logging INFO
    const logging = new Logging();
    const log = logging.log('my-trace-log');
    const text = `HELLOPUBSUB, start: ${startTime}, end:${endTime}, execution: ${executionTime}, ${name}, invoke_time: ${invoke_time}`;
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
    
});


function uploadFile(traceId) {
  return new Promise(async (resolve, reject) => {

    const storage = new Storage();

    const bucketName = 'my-trigger-chain-storage';

    const filePath = './upload_text.txt'

    const destFileName = `${traceId}.txt`;

    // Uploading a file to the bucket
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

