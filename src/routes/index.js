const express = require('express');
const router = express.Router();

const socialRoutes = require('routes/social');
const userRoutes = require('routes/user');
const authRoutes = require('routes/auth');
const salaryRoutes = require('routes/salary');

router.use('/auth', authRoutes);
router.use('/social', socialRoutes);
router.use('/user', userRoutes);
router.use('/api', salaryRoutes);

module.exports = router;
