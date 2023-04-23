module.exports = {
  database: {
    mongoURI: process.env.MONGODB_URI,
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
