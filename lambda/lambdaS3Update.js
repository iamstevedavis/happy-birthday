const aws = require('aws-sdk');

const lambda = new aws.Lambda();

// eslint-disable-next-line no-unused-vars
exports.handler = function _lambdaS3Update(event, context) {
  console.log('event', JSON.stringify(event));
  console.log('context', JSON.stringify(context));

  const functionName = process.env.LAMBDA_FUNCTION_NAME;
  const s3Key = process.env.S3_KEY;
  const s3Bucket = process.env.S3_BUCKET;
  console.info(`Updating Lambda Function ${functionName} from ${s3Bucket} - ${s3Key}`);
  const params = {
    FunctionName: functionName,
    S3Key: s3Key,
    S3Bucket: s3Bucket,
  };
  lambda.updateFunctionCode(params, (err, data) => {
    if (err) {
      console.error(err, err.stack);
      context.fail(err);
    } else {
      console.info(data);
      context.succeed(data);
    }
  });
};
