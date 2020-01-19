const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const Twilio = require('twilio');

// If modifying these scopes, delete token.json.
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/contacts',
];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';
const TWILIO_TOKEN_PATH = 'twilio_token.json';

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('Enter the code from that page here: ', (code) => {
      resolve(code);
    });
  })
    .then((code) => {
      rl.close();
      return oAuth2Client.getToken(code);
    })
    .then((res) => res.tokens);
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
async function authorize(credentials) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0],
  );
  let token = null;
  let needsAuth = false;

  try {
    token = fs.readFileSync(TOKEN_PATH);
    oAuth2Client.setCredentials(JSON.parse(token));
  } catch (error) {
    needsAuth = true;
  }

  if (needsAuth) {
    token = await getAccessToken(oAuth2Client);
    oAuth2Client.setCredentials(token);
    console.log('Writing Google credentials file...');
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
    console.log('Successfully wrote Google credentials file');
  }
  return oAuth2Client;
}

/**
 * Lists the next 10 events on the user's primary calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function listEvents(auth) {
  const calendar = google.calendar({ version: 'v3', auth });
  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date().toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime',
  });

  const events = res.data.items;
  if (events.length) {
    console.log('Upcoming 10 events:');
    events.forEach((event) => {
      const start = event.start.dateTime || event.start.date;
      console.log(`${start} - ${event.summary}`);
    });
  } else {
    console.log('No upcoming events found.');
  }
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

  const birthdays = [];
  connections.forEach((connection) => {
    let birthdayObject = { name: connection.names[0].displayName };
    let hasBirthday = false;
    let shouldSendBirthday = false;
    let hasMobileNumber = false;
    if (connection.phoneNumbers) {
      connection.phoneNumbers.forEach((number) => {
        if (number.type === "mobile") {
          hasMobileNumber = true;
          birthdayObject.to = number.canonicalForm;
        }
      })
    }
    if (connection.birthdays) {
      connection.birthdays.forEach((birthday) => {
        if (birthday.date) {
          const today = new Date();
          if (birthday.date.month === today.getMonth() + 1 && birthday.date.day === today.getDate()) {
            hasBirthday = true;
          }
        }
      });
    }
    if (hasBirthday) {
      if (connection.userDefined) {
        connection.userDefined.forEach((userDefined) => {
          if (userDefined.key === 'happyBirthday' && userDefined.value === 'true') {
            shouldSendBirthday = true;
          }
        });
      }
    }
    if (hasBirthday && shouldSendBirthday && hasMobileNumber) {
      birthdays.push(birthdayObject)
    };
  });
  return birthdays;
}

async function sendTwilioMessages(twilioClient, messages) {
  return Promise.all(messages.map((message) => {
    return twilioClient.messages.create({
      body: `Happy Birthday ${message.name}! I hope you have a great day! From Steve!`,
      to: message.to,
      from: '+12262127469',
    })
  }))
}

async function getTwilioClient() {
  let credentials;

  credentials = fs.readFileSync(TWILIO_TOKEN_PATH);

  const { accountSid, authToken } = JSON.parse(credentials);

  return new Twilio(accountSid, authToken);
}

async function happyBirthday() {
  let credentialsContent = null;
  try {
    credentialsContent = fs.readFileSync('credentials.json', 'utf8');
  } catch (error) {
    if (error) console.log('Error loading Google client secret file:', error);
    process.exit(1);
  }

  let oAuth2Client = null;
  try {
    oAuth2Client = await authorize(JSON.parse(credentialsContent));
  } catch (error) {
    if (error) console.log('Error authorizing against Google:', error);
    process.exit(1);
  }

  const birthdaysToSend = await getBirthdays(oAuth2Client);

  let twilioClient;
  try {
    twilioClient = await getTwilioClient();
  } catch (error) {
    if (error) console.log('Error loading Twilio secret file:', error);
    process.exit(1);
  }

  let twilioSuccessMessages;
  try {
    twilioSuccessMessages = await sendTwilioMessages(twilioClient, birthdaysToSend);
  } catch (error) {
    if (error) console.log('Error sending twilio messages:', error);
    process.exit(1);
  }
  return { birthdaysSent: `Sent ${twilioSuccessMessages.length} happy birthdays.`, birthdaysToSend };
}


exports.handler = async (event) => {
  const { birthdaysSent, birthdaysToSend } = await happyBirthday();
  const response = {
    statusCode: 200,
    body: { birthdaysSent, recipients: birthdaysToSend },
  };
  return response;
};