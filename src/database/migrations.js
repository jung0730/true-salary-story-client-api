const User = require('models/User');
const Point = require('models/Point');

// 原先用於兼容新舊帳號積分功能，因為資料已清洗，暫時不需要，等待後續穩定後移除
async function createPointsForExistingUsers() {
  const users = await User.find({ points: { $exists: false } });

  for (const user of users) {
    const point = await Point.create({
      user: user._id,
      point: 0,
    });

    user.points = point._id;
    await user.save();
  }
}

module.exports = createPointsForExistingUsers;
