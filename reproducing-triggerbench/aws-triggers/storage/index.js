const pulumi = require('@pulumi/pulumi');
const automation = require('@pulumi/pulumi/automation');
const aws = require('@pulumi/aws');

const getStorageTrigger = async () => {
  // Import shared resources
  const user = await automation.LocalWorkspace.create({})
    .then((ws) => ws.whoAmI()
      .then((i) => i.user));
  const shared = new pulumi.StackReference(`${user}/aws-trigger-bench/shared`);

  const roleId = shared.requireOutput('roleId');
  const role = aws.iam.Role.get('DeveloperRole', roleId);

  // The lambda function, retrieved from a file in order to enable X-ray
  const fn = new aws.lambda.Function('StorageTriggerLambda', {
    code: new pulumi.asset.AssetArchive({
      '__index.js': new pulumi.asset.FileAsset('../handlers/index.js'),
      node_modules: new pulumi.asset.FileArchive('./node_modules'), // Automatically zipped when deploying
    }),
    handler: '__index.handler', // Change to __index.<xyz> to change the lambda function
    runtime: "nodejs18.x", 
    role: role.arn,
    tracingConfig: {
      mode: 'Active', // Enable active X-ray
    },
  });

  // Create the storage trigger using a bucket and an onObjectCreated event for it
  const triggerBucket = new aws.s3.Bucket('triggerBucket', {
    forceDestroy: true,
  });
  triggerBucket.onObjectCreated('objectCreatedHandler', fn);

  return triggerBucket;
};

exports.url = getStorageTrigger().then((bucket) => bucket.id);
