module.exports = {
  database: {
    mongoURI: process.env.MONGODB_URI,
  },
  passport: {
    google: {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:
        'https://true-salary-story-client-api-production.up.railway.app/social/google/callback',
    },
  },
  jwtSecret: process.env.JWT_SECRET,
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
};
