# Cross-provider Serverless Trigger Benchmarker

This repository contains the cross-provider serverless trigger thesis study's AWS ([aws-trigger-benchmarker](./aws-trigger-benchmarker/)) and GCP ([google-trigger-benchmarker](./google-trigger-benchmarker/)) scripts. 

As the frameworks and services applied change according to the cloud provider, we have written two serverless benchmarkers, and the main cloud function, Infra, and the other Receiver functions with different trigger types have been written.

Furthermore, each component has its own architecture, which is a chain of function algorithms, and each component executes functions in a completely different order.

Cloud providers refer to queue triggering as sns in AWS and pub/sub in GCP. To be clear on the technology used, these terminations have been used but written as Message trigger in the thesis study.

## Benchmarking Orchestrator (AWS: [benchmarking-orchestrator](./aws-trigger-benchmarker/benchmarking-orchestrator) and Google: [benchmarking-orchestrator](./google-trigger-benchmarker/benchmarking-orchestrator))

This is the main algorithm that orchestrates the workload creation by sending requests to the Infra module with unique parameters. The algorithm offers three distinct options for experimentation: cold/warm start measurements, a chain of functions, and runtime experiments. We have designed each of these scenarios to optimally trigger resources and collect and install relevant data in local folders.

### Trace Parser and Plotting (AWS: [plot](./aws-trigger-benchmarker/plot) and Google: [plot](./google-trigger-benchmarker/plot))

During the thesis study, we utilized three of the four trace collection, trace processing, and plotting functions we wrote, along with ploy.py for the bar chart execution checks. The other three plot Python scripts we used included the ECDF for cold/warm comparison, the boxplot runtime experiment, and the chain of functions table.

## Infra Module (AWS: [infra](./aws-trigger-benchmarker/infra) and Google: [infra](./google-trigger-benchmarker/infra))

Infra is the primary cloud function that receives HTTP requests from serverless functions, triggers relevant functions, and logs the execution data. The Receiver function receives the changes that the Infra module makes, like chaining a variable in the database, adding a file to the S3 bucket, or sending a request. We have designed the receiver functions to respond to these actions and log their execution data to the cloud service.

## Repreducing TriggerBench Research [TriggerbeBench](./reproducing_triggerbench) 

During this implementation TriggerBench README file has been used to create cloud recourses and implement relevant experiments. Also small changes applied in the experimental plans has been added in [modified-experiment-plans](./reproducing-triggerbench/modified-experiment-plans) . After the experiments has been accomplished a Python virtal environment has been used to generate graphs. As Node.js 12 has not been supported anymore we have reproduced this experiment with the new version of Node.js 20 and the codes of this implementation also shared. Joel et al.'s code has been used only in folder [reproducing-triggerbench](./reproducing-triggerbench). In order to apply it on changing cloud provider environment supports these codes has been modified.

### Data Analysis

After reproducing our experiments we have used Python virtual environment to plot the needed AWS figures and is has been added to [data-analysis](./reproducing-triggerbench/data-analysis).


### Reference

Joel Scheuner, Marcus Bertilsson, Oskar Grönqvist, Henrik Tao, Henrik Lagergren, Jan-Philipp Steghöfer, Philipp Leitner, "TriggerBench: A Performance Benchmark for Serverless Function Triggers," in *IEEE International Conference on Cloud Engineering (IC2E)*, 2022.


Google Cloud Functions Triggers (2nd Gen) Documentation. (2024). Available online: [Google Cloud - Calling Functions](https://cloud.google.com/functions/docs/calling).

In Runtime Experiments Java HTTP functions has been utilized:

- [Google Java HTTP Cloud Function Example](google-trigger-benchmarker/runtime/helloworld): "Example to create and Deploy an HTTP Cloud Function with Java." Available online: [Google Cloud Documentation](https://cloud.google.com/functions/docs/create-deploy-http-java). Accessed June 3, 2024.

- [AWS Java Lambda Functions Example](aws-trigger-benchmarker/runtime/javascript-http-noexpress): "Amazon Web Service Lambda Functions Java Implementation Examples." Available online: [GitHub Repository](https://github.com/serverless/examples/tree/master/aws-java-simple-http-endpoint). Accessed April 5, 2024.

- AWS Python Lambda Function Template: During python runtime implementation serverless framework HTTP template has been used to give it a start. For more detailed examples, refer to the [Serverless Examples repository](https://github.com/serverless/examples/).

### Tools and Technologies

- **AWS SDK**: Employed for accessing AWS services such as DynamoDB, Lambda, SNS, CloudWatch for logging, and S3 for bucket operations. This includes adding items to buckets, edition databases and capturing logs. For comprehensive information, visit the [AWS SDK Documentation](https://aws.amazon.com/documentation/sdk-for-javascript/).

- **Google SDK**: Used for interacting with Google Cloud services like Firestore, Pub/Sub, S3 Storage,  Cloud Logging, . This includes operations such as adding items to buckets, editing databases, publishing messages and logging service interactions. More details can be found in the [Google Cloud SDK Documentation](https://cloud.google.com/sdk/docs).

- **Serverless Framework**: Utilized for configuring and deploying AWS Lambda functions seamlessly. For more information, visit the [Serverless Framework Documentation](https://www.serverless.com/framework/docs/).

#### Firebase Integration

In Google Trigger Benchmarking the [Infra](google-trigger-benchmarker/infra) module and [Storage Chain](google-trigger-benchmarker/chain/storage-chain) has utilized Firebase Admin SDK for secure connection and data management:

- **Firebase Admin SDK - Credential Namespace**: Detailed information on credential management with Firebase Admin SDK can be found [Firebase Documentation](https://firebase.google.com/docs/reference/admin/node/firebase-admin.credential_n). Accessed August, 2024.

### Code Snippet:
```javascript
const serviceAccountPath = './deep-beanbag-395510-35ed4ff9215b.json';
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://deep-beanbag-395510.firebaseio.com'
});

const db = admin.firestore();
```
While using frebase in [Database Receiver](google-trigger-benchmarker/receiver-functions/database) we utilized Protocol Buffers (protobuf) to manage structured data. For protocol buffers copy of the Apache License, Version 2.0 can be found at [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).

```javascript
console.log('Loading protos...');
const root = await protobuf.load('data.proto');
const DocumentEventData = root.lookupType('google.events.cloud.firestore.v1.DocumentEventData');
```

### Dependencies:

The AWS Trigger Benchmarker project relies on the following packages: 

project relies on the following packages:

- `@aws-sdk/client-dynamodb` version 3.596.0
- `@aws-sdk/lib-dynamodb` version 3.596.0
- `aws-sdk` version 2.1639.0
- `axios` version 1.7.2
- `express` version 4.19.2
- `serverless-http` version 3.2.0
- `uuid` version 10.0.0

The Google Trigger Benchmarker project relies on the following packages:

- `@google-cloud/firestore` version 7.7.0
- `@google-cloud/functions-framework` version 3.4.0
- `@google-cloud/logging` version 11.0.0
- `@google-cloud/pubsub` version 4.4.0
- `@google-cloud/storage` version 7.11.0
- `axios` version 1.6.8
- `firebase-admin` version 12.1.1
- `google-auth-library` version 9.10.0
- `path` version 0.12.7
- `uuid` version 9.0.1

## Deployment
Initially, we must deploy all the Receiver cloud functions and the Infra module with appropriate authentication, ensuring these resources are ready before the experiments begin. Once we deploy the functions, we must integrate the created URLs with the benchmarker orchestrator and Infra to actively trigger and activate these resources. We have also utilized the serverless framework in AWS to ensure a more reproducible solution. However, GCP did not support this framework, so we conducted all deployment and authentication using the GCP CLI.

In order to run AWS serverless functions, please use serverless deploy in that directory and paste the produced URL into the relevant component tirregering that cloud resource.


## Prerequisites

What things you need to install the software and how to install them:

- Google Cloud SDK
- AWS CLI
- Serverless Framework
- Node.js
- Python

## Installation

### Google Cloud CLI (gcloud)

1. **Install the Google Cloud SDK**:
   - Download the Google Cloud SDK from [Google Cloud SDK](https://cloud.google.com/sdk/docs/install).
   - Follow the installation instructions for your specific operating system.

### AWS CLI

1. **Install AWS CLI**:
   - Download the AWS CLI from [AWS CLI](https://aws.amazon.com/cli/).
   - Follow the installation instructions for your specific operating system.

### Serverless Framework 
This is needed while deloying AWS cloud functions with needed authentication.

1. **Install Node.js**:
   - Download and install Node.js from [Node.js official website](https://nodejs.org/). The Serverless Framework requires Node.js to run.
   
2. **Install Serverless Framework**:
   - Install the Serverless Framework globally using npm:
   ```bash
   npm install -g serverless

## Configuration and Authentication

<!-- ### Google Cloud CLI (gcloud) -->

1. **Initialize the Google SDK**:
   Initialize the SDK to authenticate your Google account and set up your project settings:
   ```bash
   gcloud init
    ```
    For this implementation we have used JSON authentication format
    ```bash
    export GOOGLE_APPLICATION_CREDENTIALS='path to your JSON configuration file'
    ```
2. **Configure AWS CLI**:
   - After installation, configure the AWS CLI with your credentials to set up access to AWS services:
    ```bash
    aws configure
    ```

## Additional Documentation

For this implementation documentation and public codes of Google’s Java guides and AWS serverless source codes were highly instrumental in providing valuable assis- tance to make this experiment. Particularly when constructing Java  and Python HTTP functions the serverless examples have been used. 

1. **Create and Deploy an HTTP Cloud Function with Java**  
   [Google Cloud Java Documentation](https://cloud.google.com/functions/docs/create-deploy-http-java)  
   *Accessed: June 3, 2024*  
   Citation Year: 2023

2. **Amazon Web Service Lambda Functions Java Implementation Examples**  
   [AWS Java Examples on GitHub](https://github.com/serverless/examples/tree/master/aws-java-simple-http-endpoint)  
   *Accessed: April 5, 2024*

3. **Create and Deploy an HTTP Cloud Function with Python**  
   [Google Cloud Python Documentation](https://cloud.google.com/functions/docs/create-deploy-http-python)  
   *Journal: Google Cloud*  
   Citation Year: 2023
