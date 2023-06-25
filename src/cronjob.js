const cron = require('node-cron');
const Keyword = require('./models/Keyword');
const KeywordHistory = require('./models/KeywordHistory');

const updateKeywordCollection = async () => {
  try {
    const keywordHistories = await KeywordHistory.find({}).exec();

    const keywordCounts = {};

    keywordHistories.forEach((keywordHistory) => {
      const keyword = keywordHistory.keyword;
      keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
    });

    for (const keyword in keywordCounts) {
      const count = keywordCounts[keyword];

      let keywordDoc = await Keyword.findOne({ keyword });

      if (keywordDoc) {
        keywordDoc.linkNumber += count;
      } else {
        keywordDoc = new Keyword({
          keyword,
          linkNumber: count,
        });
      }

      await keywordDoc.save();
    }

    await KeywordHistory.deleteMany({});
  } catch (error) {
    console.error('Error updating keyword collection:', error);
  }
};

cron.schedule('0 * * * *', updateKeywordCollection);

updateKeywordCollection();

module.exports = updateKeywordCollection;
