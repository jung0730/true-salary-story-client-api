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
const pointRoutes = require('routes/point');

router.use('/auth', authRoutes);
router.use('/social', socialRoutes);
router.use('/user', userRoutes);
router.use('/api', salaryRoutes);
router.use('/api', accountRoutes);
router.use('/api', companyRoutes);
router.use('/linePay', linePayRoutes);
router.use('/api', orderRoutes);
router.use('/api/public', publicRoutes);
router.use('/api/point', pointRoutes);

module.exports = router;
