const { LambdaClient, UpdateFunctionCodeCommand } = require('@aws-sdk/client-lambda');

// eslint-disable-next-line no-unused-vars
exports.handler = function _lambdaS3Update(event, context) {
  const client = new LambdaClient();
  const eventDataRecords = event.Records;
  const promises = [];

  eventDataRecords.forEach((eventDataRecord) => {
    const s3EventData = eventDataRecord.s3;
    const functionName = s3EventData.object.key.replace(/\.[^/.]+$/, '');
    const s3Key = s3EventData.object.key;
    const s3Bucket = s3EventData.bucket.name;

    console.info(`Updating Lambda Function ${functionName} from ${s3Bucket} - ${s3Key}`);
    const params = {
      FunctionName: functionName,
      S3Key: s3Key,
      S3Bucket: s3Bucket,
    };

    const command = new UpdateFunctionCodeCommand(params);

    promises.push(client.send(command));
  });

  return Promise.all(promises);
};
