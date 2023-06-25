const express = require('express');

const router = express.Router();
const passport = require('passport');
const FRONTEND_URL = process.env.FRONTEND_URL;

router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] }),
);

router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, user, info) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      return next({ message: 'Authentication failed', statusCode: 401 });
    }

    // Create a JSON object containing the tokens
    const tokens = {
      token: user.token,
      refreshToken: user.refreshToken,
    };

    // Base64 encode the JSON object
    const encodedTokens = Buffer.from(JSON.stringify(tokens)).toString(
      'base64',
    );

    res.redirect(`${FRONTEND_URL}/login?tokens=${encodedTokens}`);
  })(req, res, next);
});

// 預期擴增 Line Login

module.exports = router;
