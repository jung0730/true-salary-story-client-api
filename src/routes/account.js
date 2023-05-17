const express = require('express');
const router = express.Router();

const jwtAuthMiddleware = require('middleware/jwtAuthMiddleware');

const Post = require('models/Post');
const User = require('models/User');
const Company = require('models/Company');

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

router.get(
  '/account/salary/shared/list',
  jwtAuthMiddleware,
  async (req, res) => {
    const { id } = req.user;

    const { keyword } = req.query;
    let { page } = req.query;
    const { limit: perPage } = req.query;

    try {
      const q = !!keyword ? { companyName: new RegExp(keyword) } : {};
      const findRule = { createUser: id, ...q };

      if (!page) {
        page = 1;
      }

      const data = await Post.find(findRule)
        .populate({
          path: 'createUser',
          select: 'displayName _id',
        })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .select(
          'title companyName city employmentType monthlySalary createDate seen',
        );

      const totalCount = await Post.countDocuments(findRule);

      res.json({
        message: '成功',
        result: data,
        totalCount,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.post(
  '/account/salary/:id/subscribe',
  jwtAuthMiddleware,
  async (req, res) => {
    const { id: userId } = req.user;
    const { id: companyId } = req.params;

    try {
      const isDuplicate = await User.findById(userId).countDocuments({
        subscribing: {
          $elemMatch: { company: companyId },
        },
      });
      if (isDuplicate) {
        return res.json({ message: '您已訂閱' });
      }

      const isExist = await Company.findById(companyId).exec();
      if (!isExist) {
        return res.status(400).json({ message: '查無此公司' });
      }

      await User.updateOne(
        {
          _id: userId,
        },
        {
          $addToSet: { subscribing: { company: companyId } },
        },
      );

      await Company.updateOne(
        {
          _id: companyId,
        },
        {
          $addToSet: { subscribed: { user: userId } },
        },
      );

      res.json({ message: '訂閱成功' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

module.exports = router;
