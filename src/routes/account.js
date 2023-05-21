const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const isValidObjectId = mongoose.Types.ObjectId.isValid;

const jwtAuthMiddleware = require('middleware/jwtAuthMiddleware');

const Post = require('models/Post');
const User = require('models/User');
const Company = require('models/Company');
const Order = require('models/Order');

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
      if (!isValidObjectId(companyId)) {
        return res.status(400).json({ message: 'Id格式錯誤' });
      }

      const isExist = await Company.findById(companyId).exec();
      if (!isExist) {
        return res.status(400).json({ message: '查無此公司' });
      }

      const isDuplicate = await User.findById(userId).countDocuments({
        subscribing: {
          $elemMatch: { company: companyId },
        },
      });
      if (isDuplicate) {
        return res.json({ message: '您已訂閱' });
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

router.delete(
  '/account/salary/:id/subscribe',
  jwtAuthMiddleware,
  async (req, res) => {
    const { id: userId } = req.user;
    const { id: companyId } = req.params;

    try {
      if (!isValidObjectId(companyId)) {
        return res.status(400).json({ message: 'Id格式錯誤' });
      }

      const isExist = await Company.findById(companyId).exec();
      if (!isExist) {
        return res.status(400).json({ message: '查無此公司' });
      }

      const isExistSubscribing = await User.findById(userId).countDocuments({
        subscribing: {
          $elemMatch: { company: companyId },
        },
      });
      if (!isExistSubscribing) {
        return res.status(400).json({ message: '未訂閱此公司，不可取消訂閱' });
      }

      await User.updateOne(
        {
          _id: userId,
        },
        {
          $pull: { subscribing: { company: companyId } },
        },
      );

      await Company.updateOne(
        {
          _id: companyId,
        },
        {
          $pull: { subscribed: { user: userId } },
        },
      );

      res.json({ message: '您已成功取消訂閱' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.get(
  '/account/salary/following/list',
  jwtAuthMiddleware,
  async (req, res) => {
    const { id } = req.user;

    const { keyword } = req.query;
    let { page } = req.query;
    const { limit: perPage } = req.query;

    try {
      if (!page) {
        page = 1;
      }

      const data = await User.findById(id)
        .populate({
          path: 'subscribing',
          populate: {
            path: 'company',
            select: 'companyName photo address shared',
          },
        })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .select('subscribing');

      const filterData = data.subscribing.filter((o) =>
        o.company.companyName.includes(keyword),
      );

      res.json({
        result: filterData,
        totalCount: filterData.length,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.get('/account/order/list', jwtAuthMiddleware, async (req, res) => {
  const { id } = req.user;

  let { page } = req.query;
  const { limit: perPage } = req.query;

  try {
    const findRule = { createUser: id };

    if (!page) {
      page = 1;
    }

    const data = await Order.find(findRule)
      .skip((page - 1) * perPage)
      .limit(perPage)
      .select('orderId orderName paymentMethod createDate price');

    const totalCount = await Order.countDocuments(findRule);

    res.json({
      message: '成功',
      result: data,
      totalCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
