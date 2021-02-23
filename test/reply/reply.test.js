const { expect } = require('chai');
const sandbox = require('sinon').createSandbox();
const reply = require('../../lambda/reply');

describe('replies', () => {
  afterEach(() => {
    sandbox.restore();
  });

  it('should send', async () => {
    process.env.TWILIO_SUMMARY_NUMBER = '123';
    process.env.TWILIO_NUMBER = '456';
    sandbox.stub(reply, 'getTwilio').callsFake(() => ({
      messages: {
        create: (body) => {
          expect(body).to.deep.equal({ body: 'This is a test!', to: '+123', from: '+456' });
        },
      },
    }));

    const results = await reply.handler({ Body: encodeURI('This is a test!') });
    expect(results).to.equal('<?xml version="1.0" encoding="UTF-8"?><Response><Message><Body>I will forward that along to Steve!</Body></Message></Response>');
  });
});
