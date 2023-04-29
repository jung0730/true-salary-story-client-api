const express = require('express');
const router = express.Router();

const User = require('models/User');
const jwtAuthMiddleware = require('middleware/jwtAuthMiddleware');

router.get('/profile', jwtAuthMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select(
      'displayName email profilePicture',
    );

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

module.exports = router;
