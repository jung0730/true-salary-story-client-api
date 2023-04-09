// controllers/authController.js
const express = require('express');
const router = express.Router();
const passport = require('@/config/passport');

router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] }),
);

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function (req, res) {
    // Send JWT to the frontend
    res.redirect(`/callback?token=${req.user}`);
  },
);

module.exports = router;
