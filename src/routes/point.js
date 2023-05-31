const express = require('express');
const router = express.Router();
const PointHistory = require('models/PointHistory');
const jwtAuthMiddleware = require('middleware/jwtAuthMiddleware');

router.get('/history', jwtAuthMiddleware, async (req, res, next) => {
  try {
    const { category, page = 1, pageSize = 10 } = req.query;
    let pointCondition;

    if (category === 'gain') {
      pointCondition = { point: { $gt: 0 } };
    } else if (category === 'used') {
      pointCondition = { point: { $lt: 0 } };
    } else {
      pointCondition = {};
    }

    const user = req.user.id;
    const total = await PointHistory.countDocuments({
      user,
      ...pointCondition,
    });

    const pointHistories = await PointHistory.find({ user, ...pointCondition })
      .sort({ createdAt: -1 })
      .limit(parseInt(pageSize))
      .skip((parseInt(page) - 1) * parseInt(pageSize));

    res.status(200).json({
      message: 'Fetch successful',
      data: pointHistories,
      totalCount: total,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
