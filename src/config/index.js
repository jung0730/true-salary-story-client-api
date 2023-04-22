module.exports = {
  database: {
    mongoURI: 'mongodb://localhost:27017/true-salary-story-client',
  },
  passport: {
    google: {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/auth/social/google/callback',
    },
  },
  jwtSecret: process.env.JWT_SECRET,
};
