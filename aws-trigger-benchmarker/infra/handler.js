const serverless = require("serverless-http");
const express = require("express");
const app = express();
const { v4: uuidv4 } = require('uuid');

const axios = require('axios');
const AWS = require('aws-sdk');
const region = process.env.AWS_REGION || 'eu-west-3'; // Default to 'eu-west-3'  
AWS.config.update({ region: region });

// Create service objects
const cloudwatchlogs = new AWS.CloudWatchLogs();
const s3 = new AWS.S3();
const sns = new AWS.SNS();


const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");

const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} = require("@aws-sdk/lib-dynamodb");

const USERS_TABLE = "users-table";

const client = new DynamoDBClient();
const docClient = DynamoDBDocumentClient.from(client);

app.get("/", async (req, res, next) => {
  
  infraInvokeTime = Date.now()
  console.log(req.query)
  trigger = req.query.trigger
  runtime = req.query.runtime 
  // traceId = req.query.traceId
  traceId = req.query.traceId || uuidv4() // If trace id is not specified it will be created
  if (!trigger) {
    return res.status(400).send('Undefined Trigger!!');
  }
  console.log(`Triggering: ${trigger} at ${new Date().toISOString() } with traceID: ${traceId}`)

  if (runtime == 'python'){
    url = `https://fxha61wdsa.execute-api.eu-west-3.amazonaws.com/`
    var response = await sendRequest(url, req.query);
    response.infraInvokeTime = infraInvokeTime
    res.status(200).json(response);

  }else if(runtime =='java'){
    url = `https://sfxx550og3.execute-api.eu-west-3.amazonaws.com/time`
    var response = await sendRequest(url, req.query);
    response.infraInvokeTime = infraInvokeTime
    res.status(200).json(response);
  }else if (runtime =='javascript'){
    url = `https://rt6puw2uzf.execute-api.eu-west-3.amazonaws.com/`
    var response = await sendRequest(url, req.query);
    response.infraInvokeTime = infraInvokeTime
    res.status(200).json(response);
  }else{
    let name =  `${traceId}`  
    let userId = '1'
    switch (trigger) {
      
      case 'http':
        url = `https://q9p6etpd2j.execute-api.eu-west-3.amazonaws.com/`
        var response = await sendRequest(url, req.query);
        response.infraInvokeTime = infraInvokeTime
        res.status(200).json(response);
        break;
      case 'storage':
        
        try {
          const bucketName = 'mybucket-triggerbench-2';  
          const fileName = `uploads/${traceId}.txt`;  
          const fileContent = 'Sample text content';  

          const params = {
            Bucket: bucketName,
            Key: fileName,
            Body: fileContent,
            ContentType: 'text/plain'
          };

          const data = await s3.upload(params).promise();
          res.status(200).json({
            message: 'File uploaded successfully',
            fileUrl: data.Location,
            // storageTriggerTime: data.startTime,
            infraInvokeTime
          });
        } catch (err) {
          console.error('Error uploading file:', err);
          res.status(500).json({

            message: 'File upload failed',
            error: err.message
          });
        }
        break;
      case 'sns':
        // AWS Simple Notification Service 
        const topicArn = 'arn:aws:sns:eu-west-3:199287124841:mySNSTopic';  
        const message = `${traceId}`;
    
        publishMessage(topicArn, message)
        .then(data => {
          console.log('Message published successfully:', data);
          res.status(200).json({
            message: 'Message published successfully',
            data,
            infraInvokeTime
          });
        })
        .catch(error => {
          console.error('Error publishing message:', error);
        });
      
        

        break;
      case 'database_update':
        
        userId = '1'
        
        if (typeof userId !== "string") {
          res.status(400).json({ error: '"userId" must be a string' });
        } else if (typeof name !== "string") {
          res.status(400).json({ error: '"name" must be a string' });
        }

        let params = {
          TableName: USERS_TABLE,
          Item: { userId, name },
        };

        try {
          const command = new PutCommand(params);
          await docClient.send(command);
          res.json({ userId, name , infraInvokeTime});
        } catch (error) {
          console.error(error);
          res.status(500).json({ error: "Could not create user" });
        }
        break;
      case 'database':
        //Inserting new User Data
        userId = `${infraInvokeTime}` 
        if (typeof userId !== "string") {
          res.status(400).json({ error: '"userId" must be a string' });
        } else if (typeof name !== "string") {
          res.status(400).json({ error: '"name" must be a string' });
        } else {
          
          const params = {
            TableName: USERS_TABLE,
            Item: { userId, name },
          };
      
          try {
             
            const command = new PutCommand(params);
            await docClient.send(command);
      
            
            res.json({ userId, name, infraInvokeTime });
          } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Could not create user" });
          }
        }
        break;
      default:
        res.status(400).send('Invalid action specified');

    }
  }
 
});

function sendRequest(url, queryParams) {
  return new Promise(async (resolve, reject) => { 

  axios.get(url, {  headers: {
    // Authorization: `Bearer ${idToken}`
  },params: queryParams })
    .then(response => {
      resolve(response.data);
    })
    .catch(error => {
      reject(new Error('There was a problem with the Axios request:'+ error.message));
    });
  });
}


function publishMessage(topicArn, message) {
  return new Promise((resolve, reject) => {
    const params = {
      Message: message,
      TopicArn: topicArn
    };

    sns.publish(params).promise()
      .then(data => {
        resolve(data);
      })
      .catch(error => {
        reject(new Error('There was a problem with the SNS publish request: ' + error.message));
      });
  });
}


exports.handler = serverless(app);
