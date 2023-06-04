const express = require('express');
const router = express.Router();

const socialRoutes = require('routes/social');
const userRoutes = require('routes/user');
const authRoutes = require('routes/auth');
const salaryRoutes = require('routes/salary');
const accountRoutes = require('routes/account');
const companyRoutes = require('routes/company');
const linePayRoutes = require('routes/pay/linePay');
const orderRoutes = require('routes/order');
const publicRoutes = require('routes/public');

// 三方登入
router.use('/social', socialRoutes);
// 三方金流
router.use('/api/linePay', linePayRoutes);
router.use('/api/auth', authRoutes);
router.use('/api/user', userRoutes);
router.use('/api', salaryRoutes);
router.use('/api', accountRoutes);
router.use('/api', companyRoutes);
router.use('/api', orderRoutes);
router.use('/api/public', publicRoutes);

module.exports = router;
