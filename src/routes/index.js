const express = require('express');
const router = express.Router();

const socialRoutes = require('routes/social');
const userRoutes = require('routes/user');
const authRoutes = require('routes/auth');

router.use('/auth', authRoutes);
router.use('/social', socialRoutes);
router.use('/user', userRoutes);

module.exports = router;
