const mongoose = require('mongoose');

const KeywordHistorySchema = new mongoose.Schema(
  {
    keyword: {
      type: String,
      required: [true, '請輸入關鍵字'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { versionKey: false },
);

const KeywordHistory = mongoose.model('KeywordHistory', KeywordHistorySchema);

module.exports = KeywordHistory;
