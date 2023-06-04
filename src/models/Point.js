const mongoose = require('mongoose');

const PointSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  point: {
    type: Number,
    default: 0,
  },
  lastCheckIn: {
    type: Date,
  },
  checkInStreak: {
    type: Number,
    default: 0,
  },
});

const Point = mongoose.model('Point', PointSchema);

module.exports = Point;
