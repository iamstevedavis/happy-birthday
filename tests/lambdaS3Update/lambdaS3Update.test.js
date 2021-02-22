const { expect } = require('chai');
const sandbox = require('sinon').createSandbox();
const { LambdaClient } = require('@aws-sdk/client-lambda');
const lambdaS3Update = require('../../lambda/lambdaS3Update');

describe('lambdaS3Update', () => {
  afterEach(() => {
    sandbox.restore();
  });

  it('should update lambda', async () => {
    process.env.TWILIO_SUMMARY_NUMBER = '123';
    process.env.TWILIO_NUMBER = '456';
    sandbox.stub(LambdaClient.prototype, 'send').callsFake((params) => {
      expect(params).to.equal('response-from-getNewUpdateFunctionCodeCommand');
      return 1;
    });
    sandbox.stub(lambdaS3Update, 'getNewUpdateFunctionCodeCommand').callsFake((params) => {
      expect(params).to.deep.equal({
        FunctionName: 'functionName',
        S3Key: 'functionName.S3key',
        S3Bucket: 'my-bucket',
      });
      return 'response-from-getNewUpdateFunctionCodeCommand';
    });

    const results = await lambdaS3Update.handler({
      Records: [{
        s3: {
          bucket: {
            name: 'my-bucket',
          },
          object: {
            key: 'functionName.S3key',
          },
        },
      }],
    });
    expect(results).to.be.an('array');
    expect(results).to.deep.equal([1]);
  });
});
