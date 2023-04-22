const express = require('express');

const router = express.Router();
const User = require('models/User');
const jwtAuthMiddleware = require('middleware/jwtAuthMiddleware');

router.get('/profile', jwtAuthMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      'displayName email profilePicture',
    );
    res.status(200).json({
      status: 'success',
      message: 'User data retrieved successfully',
      data: { user },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Server error',
      data: null,
    });
  }
});

router.post('/logout', jwtAuthMiddleware, async (req, res) => {
  try {
    // record logout timestamp
    await User.findByIdAndUpdate(req.user.id, {
      logoutTimestamp: new Date(),
    });

    res.status(200).json({
      status: 'success',
      message: 'User logged out successfully',
      data: null,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Server error',
      data: null,
    });
  }
});

module.exports = router;
