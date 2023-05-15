const express = require('express');
const router = express.Router();

const socialRoutes = require('routes/social');
const userRoutes = require('routes/user');
const authRoutes = require('routes/auth');
const salaryRoutes = require('routes/salary');
const accountRoutes = require('routes/account');
const companyRoutes = require('routes/company');
const linePayRoutes = require('routes/pay/linePay');

router.use('/auth', authRoutes);
router.use('/social', socialRoutes);
router.use('/user', userRoutes);
router.use('/api', salaryRoutes);
router.use('/api', accountRoutes);
router.use('/api', companyRoutes);
router.use('/linePay', linePayRoutes);

module.exports = router;
