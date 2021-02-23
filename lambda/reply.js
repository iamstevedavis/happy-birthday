const Twilio = require('twilio');

exports.getTwilio = () => new Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

exports.createTwilioMessage = (client, body, to, from) => {
  console.info(`Sending: ${JSON.stringify({
    body: decodeURI(body),
    to,
    from,
  })}`);
  return client.messages.create({
    body: decodeURI(body),
    to,
    from,
  });
};

exports.handler = async (event) => {
  const twilioClient = module.exports.getTwilio();
  const to = `+${process.env.TWILIO_SUMMARY_NUMBER}`;
  const from = `+${process.env.TWILIO_NUMBER}`;

  console.info(`Sending message from ${from}, going to ${to}, that says ${event.Body}`);

  try {
    await module.exports.createTwilioMessage(twilioClient, event.Body, to, from);
  } catch (error) {
    console.error('Could not send message', error);
  }

  console.info('Message Sent');
  return '<?xml version="1.0" encoding="UTF-8"?><Response><Message><Body>I will forward that along to Steve!</Body></Message></Response>';
};
