const express = require('express');
const router = express.Router();
const passport = require('passport');
const FRONTEND_URL = process.env.FRONTEND_URL;

router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] }),
);

router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, user) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return next({ message: 'Authentication failed', statusCode: 401 });
    }

    const tokens = {
      token: user.token,
      refreshToken: user.refreshToken,
    };
    const encodedTokens = Buffer.from(JSON.stringify(tokens)).toString(
      'base64',
    );
    const redirectURL = `${FRONTEND_URL}/login?tokens=${encodedTokens}`;
    res.redirect(redirectURL);
  })(req, res, next);
});

module.exports = router;
