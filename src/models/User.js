const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: true,
    unique: true,
  },
  displayName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  profilePicture: {
    type: String,
    required: false,
  },
  loginTimestamp: {
    type: Date,
  },
  logoutTimestamp: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  points: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Point',
  },
});

const User = mongoose.model('User', UserSchema);

module.exports = User;
