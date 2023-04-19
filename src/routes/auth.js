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
    res.redirect(`${process.env.FRONTEND_URL}/login?token=${req.user.token}`);
  },
);

module.exports = router;
