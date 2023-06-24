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
  subscribing: [
    {
      company: {
        type: mongoose.Schema.ObjectId,
        ref: 'Company',
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  emailVerificationCode: {
    code: String,
    expiryDate: Date,
  },
  biometricEnable: {
    type: Boolean,
    default: false, // default value is 'false' indicating biometric login is disabled initially
  },
  credentials: {
    type: Array,
    default: [], // default value is an empty array
  },
});

const User = mongoose.model('User', UserSchema);

module.exports = User;
