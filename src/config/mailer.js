const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;

const oauth2Client = new OAuth2(
  process.env.GOOGLE_GMAIL_AUTH_CLIENT_ID,
  process.env.GOOGLE_GMAIL_AUTH_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground',
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_GMAIL_AUTH_REFRESH_TOKEN,
});

const accessToken = oauth2Client.getAccessToken();

const smtpTransport = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: process.env.EMAIL_ADDRESS,
    clientId: process.env.GOOGLE_GMAIL_AUTH_CLIENT_ID,
    clientSecret: process.env.GOOGLE_GMAIL_AUTH_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_GMAIL_AUTH_REFRESH_TOKEN,
    accessToken,
  },
});

module.exports = smtpTransport;
