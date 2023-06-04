const express = require('express');
const router = express.Router();

const User = require('models/User');
const PointHistory = require('models/PointHistory');
const jwtAuthMiddleware = require('middleware/jwtAuthMiddleware');

function hasUserCheckedInToday(user) {
  // Get today's date and set hours, mins, secs and ms to 0
  const today = new Date().setHours(0, 0, 0, 0);
  // Get last check-in date from user, and set hours, mins, secs and ms to 0
  // Use && to avoid error if lastCheckIn is null/undefined
  const lastCheckIn =
    user.points.lastCheckIn && user.points.lastCheckIn.setHours(0, 0, 0, 0);
  // Compare if today and lastCheckIn are equal, indicating user checked in today
  return lastCheckIn === today;
}

function hasCheckedInYesterday(user) {
  // Get yesterday's date and set hours, mins, secs and ms to 0
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  // Get last check-in date from user, and set hours, mins, secs and ms to 0
  // Use && to avoid error if lastCheckIn is null/undefined
  const lastCheckIn =
    user.points.lastCheckIn && user.points.lastCheckIn.setHours(0, 0, 0, 0);

  // Compare if yesterday and lastCheckIn are equal, indicating user checked in yesterday
  return lastCheckIn === yesterday.getTime();
}

router.get('/profile', jwtAuthMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select('displayName email profilePicture')
      .populate('points');

    if (!user) {
      return next({
        statusCode: 404,
        message: 'User not found',
      });
    }

    const hasCheckedInToday = hasUserCheckedInToday(user);

    res.status(200).json({
      status: 'success',
      message: 'User data retrieved successfully',
      data: { user, hasCheckedInToday },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/checkIn', jwtAuthMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('points');

    if (!user) {
      return next({ message: 'User not found', statusCode: 404 });
    }

    // Check if the user has already checked in today
    if (hasUserCheckedInToday(user)) {
      return next({ message: 'Already checked in today', statusCode: 400 });
    }

    // If user didn't check in yesterday, reset the streak
    if (!hasCheckedInYesterday(user)) {
      user.points.checkInStreak = 0;
    }

    // Increment the checkInStreak and award bonus points
    user.points.checkInStreak += 1;
    user.points.lastCheckIn = new Date();
    let remark = '每日簽到成功！';
    let pointRemark = 10;
    if (user.points.checkInStreak % 14 === 0) {
      user.points.point += 100;
      pointRemark = 100;
      remark = '每日簽到成功，並獲得滿 14 天獎勵！';
    } else if (user.points.checkInStreak % 7 === 0) {
      user.points.point += 50;
      pointRemark = 50;
      remark = '每日簽到成功，並獲得滿 7 天獎勵！';
    } else {
      user.points.point += 10;
    }

    // Reset the checkInStreak after 14 days
    if (user.points.checkInStreak >= 14) {
      user.points.checkInStreak = 0;
    }

    await user.points.save();

    // Create a new PointHistory record
    const pointHistory = new PointHistory({
      user: req.user.id,
      point: pointRemark,
      remark: remark,
      startDate: new Date(),
    });
    await pointHistory.save();

    res.status(200).json({
      status: 'success',
      message: 'Check-in successful, points updated',
      data: { checkInStreak: user.points.checkInStreak },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
