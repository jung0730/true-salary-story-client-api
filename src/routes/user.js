const express = require('express');
const router = express.Router();

const User = require('models/User');
const PointHistory = require('models/PointHistory');
const jwtAuthMiddleware = require('middleware/jwtAuthMiddleware');

function getCurrentUtcDate() {
  const nowTime = new Date();
  return Date.UTC(
    nowTime.getUTCFullYear(),
    nowTime.getUTCMonth(),
    nowTime.getUTCDate(),
  );
}

function hasUserCheckedInToday(user) {
  const today = getCurrentUtcDate();
  const lastCheckIn =
    user.points.lastCheckIn &&
    Date.UTC(
      user.points.lastCheckIn.getUTCFullYear(),
      user.points.lastCheckIn.getUTCMonth(),
      user.points.lastCheckIn.getUTCDate(),
    );
  return lastCheckIn === today;
}

function hasCheckedInYesterday(user) {
  const yesterday = new Date(getCurrentUtcDate());
  yesterday.setDate(yesterday.getDate() - 1);
  const lastCheckIn =
    user.points.lastCheckIn &&
    Date.UTC(
      user.points.lastCheckIn.getUTCFullYear(),
      user.points.lastCheckIn.getUTCMonth(),
      user.points.lastCheckIn.getUTCDate(),
    );
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
    user.points.lastCheckIn = new Date(getCurrentUtcDate());
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
    if (user.points.checkInStreak > 14) {
      user.points.checkInStreak = 1;
    }

    await user.points.save();

    // Create a new PointHistory record
    const pointHistory = new PointHistory({
      user: req.user.id,
      point: pointRemark,
      remark: remark,
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
