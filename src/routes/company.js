const express = require('express');
const router = express.Router();

const jwtAuthMiddleware = require('middleware/jwtAuthMiddleware');

const Company = require('models/Company');

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

router.post('/company', jwtAuthMiddleware, async (req, res) => {
  const { id } = req.user;
  const payload = {
    ...req.body,
    createUser: id,
    updateUser: id,
  };

  const company = new Company(payload);

  try {
    const result = await company.save();
    return res.status(200).json({
      message: '成功',
      result: [
        {
          taxId: result.taxId,
          companyName: result.companyName,
          point: 200,
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
