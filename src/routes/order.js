const express = require('express');
const router = express.Router();

const jwtAuthMiddleware = require('middleware/jwtAuthMiddleware');

const Order = require('models/Order');

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

router.post('/order', jwtAuthMiddleware, async (req, res) => {
  const { id } = req.user;
  const payload = {
    ...req.body,
    userId: id,
    createUser: id,
    updateUser: id,
  };

  const order = new Order(payload);

  try {
    const result = await order.save();

    return res.status(200).json({
      message: 'success',
      result: [
        {
          orderName: result.orderName,
          price: result.price,
        },
      ],
    });
  } catch (error) {
    if (error) {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res
        .status(400)
        .json({ message: '失敗', result: errors.join(', ') });
    }
    return res.status(500).json({ message: 'Server error', result: [] });
  }
});

module.exports = router;
