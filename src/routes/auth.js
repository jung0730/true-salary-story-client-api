const express = require('express');
const router = express.Router();

const User = require('models/User');
const jwtAuthMiddleware = require('middleware/jwtAuthMiddleware');

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
    next(error);
  }
});

module.exports = router;
