const User = require('models/User');
const Point = require('models/Point');

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
