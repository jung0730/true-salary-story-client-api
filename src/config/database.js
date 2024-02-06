const config = require('config');
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(config.database.mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    // 0 is a success code and 1 means uncaught fatal exception
    process.exit(1);
  }
};

module.exports = connectDB;
