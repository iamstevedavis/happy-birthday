const Twilio = require('twilio');

exports.getTwilio = () => new Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

exports.createTwilioMessage = (client, body, to, from) => {
  client.messages.create({
    body,
    to,
    from,
  });
};

exports.handler = async (event) => {
  const twilioClient = this.getTwilio();
  const to = `+${process.env.TWILIO_SUMMARY_NUMBER}`;
  const from = `+${process.env.TWILIO_NUMBER}`;
  await this.createTwilioMessage(twilioClient, event.Body, to, from);

  return '<?xml version="1.0" encoding="UTF-8"?><Response><Message><Body>I will forward that along to Steve!</Body></Message></Response>';
};
