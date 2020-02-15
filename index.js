const { google } = require('googleapis');
const Twilio = require('twilio');
const reduce = require('lodash.reduce');

require('dotenv').config();

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
async function authorize() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_INSTALLED_CLIENT_ID,
    process.env.GOOGLE_INSTALLED_CLIENT_SECRET,
    process.env.GOOGLE_INSTALLED_REDIRECT_URI,
  );

  try {
    oAuth2Client.setCredentials({
      access_token: process.env.GOOGLE_ACCESS_TOKEN,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      scope: [
        'https://www.googleapis.com/auth/contacts',
        'https://www.googleapis.com/auth/calendar.readonly',
      ],
      token_type: process.env.GOOGLE_TOKEN_TYPE,
      expiry_date: process.env.GOOGLE_EXPIRY_DATE,
    });
  } catch (error) {}

  return oAuth2Client;
}

async function getBirthdays(auth) {
  const people = google.people({ version: 'v1', auth });

  const {
    data: { connections },
  } = await people.people.connections.list({
    personFields: ['names', 'birthdays', 'phoneNumbers', 'userDefined'],
    resourceName: 'people/me',
    sortOrder: 'LAST_MODIFIED_DESCENDING',
  });

  return reduce(connections, (result, connection) => {
    const birthdayObject = { name: connection.names[0].displayName };

    if (!connection.userDefined) return result;

    const canSendHappyBirthday = connection.userDefined.find(
      (userDefined) => userDefined.key === 'happyBirthday' && userDefined.value === 'true',
    );
    if (!canSendHappyBirthday) return result;

    // Filter out anyone who does not have a cell number on record
    const contactCellNumber = connection.phoneNumbers.find(
      (phoneNumber) => phoneNumber.type === 'mobile',
    );
    if (!contactCellNumber) return result;
    birthdayObject.to = contactCellNumber.canonicalForm;

    // Filter out anyone whose birthday is not today
    const contactBirthday = connection.birthdays.find((birthday) => {
      if (birthday.date) {
        const today = new Date();
        if (
          birthday.date.month === today.getMonth() + 1
          && birthday.date.day === today.getDate()
        ) {
          return true;
        }
      }
      return false;
    });

    if (!contactBirthday) return result;

    result.push(birthdayObject);
    return result;
  }, []);
}

async function sendTwilioMessages(twilioClient, messages) {
  return Promise.all(
    messages.map((message) => twilioClient.messages.create({
      body: `Happy Birthday ${message.name}! I hope you have a great day! From Steve!`,
      to: message.to,
      from: `+${process.env.TWILIO_NUMBER}`,
    })),
  );
}

async function happyBirthday() {
  let oAuth2Client = null;
  try {
    oAuth2Client = await authorize();
  } catch (error) {
    process.exit(1);
  }

  const birthdaysToSend = await getBirthdays(oAuth2Client);
  let twilioSuccessMessages;
  try {
    twilioSuccessMessages = await sendTwilioMessages(
      new Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN),
      birthdaysToSend,
    );
  } catch (error) {
    process.exit(1);
  }
  return {
    birthdaysSent: `Sent ${twilioSuccessMessages.length} happy birthdays.`,
    birthdaysToSend,
  };
}

// eslint-disable-next-line no-unused-vars
exports.handler = async (event) => {
  const { birthdaysSent, birthdaysToSend } = await happyBirthday();
  const response = {
    statusCode: 200,
    body: { birthdaysSent, recipients: JSON.stringify(birthdaysToSend) },
  };
  return response;
};

// (async () => {
//   const { birthdaysSent, birthdaysToSend } = await happyBirthday();
//   const response = {
//     statusCode: 200,
//     body: { birthdaysSent, recipients: JSON.stringify(birthdaysToSend) },
//   };
//   return response;
// })();
