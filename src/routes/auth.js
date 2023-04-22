const express = require('express');
const socialRouter = require('routes/social');
const userRouter = require('routes/user');

const router = express.Router();

router.use('/social', socialRouter);
router.use('/user', userRouter);

module.exports = router;
