const express = require('express');
const router = express.Router();
const passport = require('config/passport');

router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] }),
);

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    res.redirect(`http://localhost:3000/login?token=${req.user.token}`);
  },
);

module.exports = router;
