// Group all require statements together
require('module-alias/register');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('config/database');
const errorHandler = require('middleware/errorHandler');
const routes = require('routes');
const passport = require('passport');
const createPointsForExistingUsers = require('database/migrations');
require('config/passport');
require('./websocket');

// Initialize Express application
const app = express();

// Connect to the database
connectDB();

// Run the migration
// createPointsForExistingUsers().catch(console.log('error'));

// Configure middleware
app.use(cors());
app.use(passport.initialize());
app.use(express.json());

// Set up routes
app.use('/', routes);

// Add error handling middleware after all routes
app.use(errorHandler);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
