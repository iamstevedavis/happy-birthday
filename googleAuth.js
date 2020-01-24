const { google } = require('googleapis');
const readline = require('readline');

// If modifying these scopes, delete token.json.
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/contacts',
];

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


token = await getAccessToken(oAuth2Client);
oAuth2Client.setCredentials(token);
console.log('Writing Google credentials file...');
fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
console.log('Successfully wrote Google credentials file');
