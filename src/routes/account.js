const express = require('express');
const router = express.Router();

const jwtAuthMiddleware = require('middleware/jwtAuthMiddleware');

const Salary = require('models/Salary');

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

router.get('/account/salary/shared/list', jwtAuthMiddleware, async (req, res) => {
  const { id } = req.user;

  const { keyword } = req.query;
  let { page } = req.query;
  const { limit: perPage } = req.query;

  try {
    const q = !!keyword ? { "companyName": new RegExp(keyword) } : {};
    const findRule = { createUser: id, ...q };

    if(!page) { 
      page = 1
    };

    const data = await Salary.find(findRule).populate({
      path: 'createUser',           
      select: 'displayName _id'
    })
    .skip((page - 1) * perPage)
    .limit(perPage)
    .select('title companyName city employmentType monthlySalary createDate seen');

    const totalCount = await Salary.countDocuments(findRule);

    res.json({ 
      message: '成功', 
      result: data, 
      totalCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
