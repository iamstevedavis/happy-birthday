const Twilio = require('twilio');

require('dotenv').config();

exports.handler = async (event) => {
  const twilioClient = new Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  await twilioClient.messages.create({
    body: event.Body,
    to: `+${process.env.TWILIO_SUMMARY_NUMBER}`,
    from: `+${process.env.TWILIO_NUMBER}`,
  });

  return '<?xml version="1.0" encoding="UTF-8"?><Response><Message><Body>I will forward that along to Steve!</Body></Message></Response>';
};
