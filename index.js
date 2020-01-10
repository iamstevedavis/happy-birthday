const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/contacts'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

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
    console.log(`Got token from file ${token}`);
    oAuth2Client.setCredentials(JSON.parse(token));
  } catch (error) {
    console.log('Needs auth');
    needsAuth = true;
  }

  if (needsAuth) {
    token = await getAccessToken(oAuth2Client);
    console.log(`Got token ${JSON.stringify(token)}`);
    oAuth2Client.setCredentials(token);
    console.log('Set credentials');
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
    console.log('Wrote credentials file');
  }
  console.log('Returning oAuth2Client');
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

async function listPeople(auth) {
  const people = google.people({ version: 'v1', auth });

  const {
    data: { connections },
  } = await people.people.connections.list({
    personFields: ['names', 'emailAddresses', 'birthdays'],
    resourceName: 'people/me',
  });
  console.log("\n\nUser's Connections:\n");
  connections.forEach((c) => console.log(JSON.stringify(c)));
}

(async () => {
  let credentialsContent = null;
  try {
    credentialsContent = fs.readFileSync('credentials.json', 'utf8');
  } catch (error) {
    if (error) console.log('Error loading client secret file:', error);
    process.exit(1);
  }

  let oAuth2Client = null;
  try {
    oAuth2Client = await authorize(JSON.parse(credentialsContent));
  } catch (error) {
    if (error) console.log('Error authorizing client:', error);
    process.exit(1);
  }

  await listPeople(oAuth2Client);
})();
