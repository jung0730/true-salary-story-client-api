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

    // Set the refreshToken in an HTTP-Only cookie.
    res.cookie('refreshToken', user.refreshToken, {
      httpOnly: true,
      secure: true, // set to true in a production environment to ensure the cookie is sent over HTTPS
      sameSite: 'none', // can be set to 'strict' or 'lax' to help prevent CSRF attacks
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // sets the cookie to expire in 30 days
    });

    res.redirect(`${FRONTEND_URL}/login?token=${user.token}`);
  })(req, res, next);
});

// 預期擴增 Line Login

module.exports = router;
