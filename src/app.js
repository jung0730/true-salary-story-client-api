const express = require('express');
const logger = require('morgan');
const cors = require('cors');
const passport = require('@/config/passport');
const db = require('@/config/database');

const authRouter = require('../controllers/authController');

const app = express();

app.use(logger('dev'));
app.use(cors());
app.use(express.json());
app.use(passport.initialize());

app.use('/auth', authRouter);

module.exports = app;
