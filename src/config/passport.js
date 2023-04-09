// config/passport.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');

const User = require('@/models/user');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/auth/google/callback',
    },
    async function (accessToken, refreshToken, profile, done) {
      // Handle user authentication here
      const payload = {
        id: profile.id,
        displayName: profile.displayName,
        email: profile.emails[0].value,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '1h', // Token expiration time, you can adjust this value
      });

      done(null, token);
    },
  ),
);

module.exports = passport;
