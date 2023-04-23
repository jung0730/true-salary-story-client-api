const express = require('express');

const router = express.Router();
const passport = require('passport');
const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3001';

router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] }),
);

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    res.redirect(`${frontendURL}/login?token=${req.user.token}`);
  },
);

// 預期擴增 Line Login

module.exports = router;
