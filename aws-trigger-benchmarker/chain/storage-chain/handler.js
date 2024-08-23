const AWS = require('aws-sdk');
const s3 = new AWS.S3();

const cloudwatchlogs = new AWS.CloudWatchLogs();
const logGroupName = '/aws/lambda/shared-log-group';


const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");

const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} = require("@aws-sdk/lib-dynamodb");
const USERS_TABLE = "users-table";

const client = new DynamoDBClient();
const docClient = DynamoDBDocumentClient.from(client);

module.exports.s3Handler = async (event) => {
  let startTime = Date.now();


  const bucket = event.Records[0].s3.bucket.name;
  const key = event.Records[0].s3.object.key;

  try {
    // Return the file name
    const fileName = key;
    console.log(`Stored file name: ${fileName} triggerStartTime: ${startTime}`);
    let name =  `${fileName.slice(8, -4)}`  
    
    userId = `${Date.now()}` 
    const database_invoke_time = Date.now()
    console.log('Saved item '+userId +' '+ name)
    if (typeof userId !== "string") {
      console.error.json({ error: '"userId" must be a string' });
    } else if (typeof name !== "string") {
      console.error.json({ error: '"name" must be a string' });
    } else {
      // Define DynamoDB params
      const params = {
        TableName: USERS_TABLE,
        Item: { userId, name },
      };
  
      
        // Use DynamoDB PutCommand to insert item
        const command = new PutCommand(params);
        response =  await docClient.send(command);
      
    }

    // const data = JSON.stringify(event);
    // await saveSharedLog(data);


    let data = event;
    data.invoke_time = database_invoke_time

    await saveSharedLog(JSON.stringify(data),startTime);

    return {
      statusCode: 200,
      body: JSON.stringify({ fileName: fileName , startTime: startTime, userId, name, response}),
    };
  } catch (err) {
    console.error(`Error processing object ${key} from bucket ${bucket}.`, err);
    throw err;
  }
};

async function saveSharedLog(data,startTime) {
  const logStreamName = `storage-chain-logStream-${Date.now()}`;
  
  try {
    // Create a log stream
    await cloudwatchlogs.createLogStream({
      logGroupName,
      logStreamName
    }).promise();
  } catch (error) {
    if (error.code !== 'ResourceAlreadyExistsException') {
      console.error('Error creating log stream:', error);
      throw error;
    }
  }

  // Put log events
  try {
    await cloudwatchlogs.putLogEvents({
      logGroupName,
      logStreamName,
      logEvents: [
        {
          timestamp: startTime,
          message: data
        }
      ]
    }).promise();
  } catch (error) {
    console.error('Error putting log events:', error);
    throw error;
  }
}
