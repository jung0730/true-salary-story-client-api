// Group all require statements together
require('module-alias/register');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('config/database');
const errorHandler = require('middleware/errorHandler');
const routes = require('routes');
const passport = require('passport');
require('config/passport');
const ws = require('./websocket');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');

// Initialize Express application
const app = express();

// Connect to the database
connectDB();

// Configure middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

// Configure express-session middleware
app.use(
  session({
    store: new MongoStore({
      mongoUrl: process.env.MONGODB_URI,
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === 'production' ? true : false,
    },
  }),
);

app.use(passport.initialize());

// Set up routes
app.use('/', routes);

// Add error handling middleware after all routes
app.use(errorHandler);

// Start the server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

ws.init(server);
