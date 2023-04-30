const express = require('express');
const router = express.Router();

const User = require('models/User');
const jwtAuthMiddleware = require('middleware/jwtAuthMiddleware');

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

    res.status(200).json({
      status: 'success',
      message: 'User data retrieved successfully',
      data: { user },
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
    const today = new Date().setHours(0, 0, 0, 0);
    const lastCheckIn =
      user.points.lastCheckIn && user.points.lastCheckIn.setHours(0, 0, 0, 0);
    if (lastCheckIn === today) {
      return next({ message: 'Already checked in today', statusCode: 400 });
    }

    // Increment the user's points and update the lastCheckIn date
    user.points.point += 1;
    user.points.lastCheckIn = new Date();
    await user.points.save();

    res.status(200).json({
      status: 'success',
      message: 'Check-in successful, points updated',
      data: { point: user.points.point },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
