const express = require('express');

const router = express.Router();
const passport = require('passport');
const frontendURL = process.env.FRONTEND_DEV_URL || 'http://localhost:3001';

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

    res.redirect(`${frontendURL}/login?token=${user.token}`);
  })(req, res, next);
});

// 預期擴增 Line Login

module.exports = router;
