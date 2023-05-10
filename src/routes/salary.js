const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const Salary = require('models/Salary');
const mongoose = require('mongoose');
const isValidObjectId = mongoose.Types.ObjectId.isValid;
const jwtAuthMiddleware = require('middleware/jwtAuthMiddleware');

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

router.post('/salary', jwtAuthMiddleware, async (req, res) => {
  const salary = new Salary(req.body);

  try {
    const result = await salary.save();
    return res.status(200).json({
      message: '成功',
      result: [
        {
          title: result.title,
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

router.get('/salary/:id', jwtAuthMiddleware, async (req, res) => {
  const id = req.params.id;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'id 格式錯誤' });
  }

  try {
    const salary = await Salary.findById(id);
    if (!salary) {
      return res.status(404).json({
        message: 'Salary not found',
        result: [],
      });
    }

    return res.status(200).json({
      message: 'Success',
      result: salary,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Server error',
      result: [],
    });
  }
});

module.exports = router;
