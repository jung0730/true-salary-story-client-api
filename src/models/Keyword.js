const mongoose = require('mongoose');

const formatDate = (date) => {
  return new Date(date).toISOString().substring(0, 10);
};

const keywordSchema = new mongoose.Schema(
  {
    rank: {
      type: Number,
    },
    score: {
      type: Number,
    },
    keyword: {
      type: String,
      required: [true, '請輸入關鍵字'],
    },
    status: {
      type: Number,
      default: 0,
    },
    linkNumber: {
      type: Number,
    },
  },
  { timestamps: true },
);

keywordSchema.set('toJSON', {
  getters: true,
});

keywordSchema.path('createdAt').get(function (date) {
  return formatDate(date);
});

keywordSchema.path('updatedAt').get(function (date) {
  return formatDate(date);
});

const Keyword = mongoose.model('Keyword', keywordSchema);

module.exports = Keyword;
