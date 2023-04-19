// Group all require statements together
require('module-alias/register');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('config/database');
const authRoutes = require('routes/auth');
const passport = require('passport');
require('config/passport');

// Initialize Express application
const app = express();

// Connect to the database
connectDB();

// Configure middleware
app.use(cors());
app.use(passport.initialize());

// Set up routes
app.use('/auth', authRoutes);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
