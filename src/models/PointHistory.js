const mongoose = require('mongoose');

const PointHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    point: {
      type: Number,
    },
    remark: {
      type: String,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { versionKey: false },
);

const PointHistory = mongoose.model('PointHistory', PointHistorySchema);

module.exports = PointHistory;
