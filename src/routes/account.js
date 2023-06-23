const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const isValidObjectId = mongoose.Types.ObjectId.isValid;

const jwtAuthMiddleware = require('middleware/jwtAuthMiddleware');

const Post = require('models/Post');
const User = require('models/User');
const Company = require('models/Company');
const Transaction = require('models/Transaction');
const PointHistory = require('models/PointHistory');
const Consult = require('models/Consult');

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

router.get('/account/point/list', jwtAuthMiddleware, async (req, res, next) => {
  const { id } = req.user;
  const { page, limit } = req.query;

  try {
    const data = await PointHistory.find({ user: id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const totalCount = await PointHistory.countDocuments({ user: id });

    res.status(200).json({
      message: 'success',
      result: data,
      totalCount: totalCount,
    });
  } catch (error) {
    next(error);
  }
});

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
      const findRule = { createUser: id, ...q, status: 'approved' };

      if (!page) {
        page = 1;
      }

      const data = await Post.find(findRule)
        .populate({
          path: 'createUser',
          select: 'displayName _id',
        })
        .sort({ createDate: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .select(
          'title companyName city employmentType monthlySalary yearlySalary dailySalary hourlySalary createDate seen taxId',
        );

      const totalCount = await Post.countDocuments(findRule);

      res.json({
        message: 'success',
        result: data,
        totalCount,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.get(
  '/account/salary/unlocked/list',
  jwtAuthMiddleware,
  async (req, res) => {
    const { id } = req.user;

    const { keyword } = req.query;
    let { page } = req.query;
    const { limit: perPage } = req.query;

    try {
      const q = !!keyword ? { companyName: new RegExp(keyword) } : {};
      const findRule = {
        ...q,
        unlockedUsers: { $elemMatch: { user: id } },
      };

      if (!page) {
        page = 1;
      }

      const data = await Post.find(findRule)
        .sort({ createDate: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .select('title companyName createDate taxId employmentType');

      const totalCount = await Post.countDocuments(findRule);

      res.json({
        message: 'success',
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

      const isExist = await Company.findById(companyId);
      if (!isExist) {
        return res.status(400).json({ message: '查無此公司' });
      }

      const isDuplicate = await User.findById(userId).countDocuments({
        subscribing: {
          $elemMatch: { company: companyId },
        },
      });
      if (isDuplicate) {
        return res.status(400).json({ message: '您已訂閱' });
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

      const isExist = await Company.findById(companyId);
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
            select: 'companyName photo address shared taxId',
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
    const findRule = { user: id };

    if (!page) {
      page = 1;
    }

    const data = await Transaction.find(findRule)
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .select('orderDetails status createdAt');

    const totalCount = await Transaction.countDocuments(findRule);

    res.json({
      message: 'success',
      result: data,
      totalCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/account/consult', jwtAuthMiddleware, async (req, res) => {
  const { receiverId, postId } = req.body;
  const userId = req.user.id;

  try {
    const findRule = { $and: [{ sender: userId }, { activePost: postId }] };
    const isDuplicate = await Consult.find(findRule);
    if (isDuplicate.length) {
      return res.status(400).json({ message: '您已請教過' });
    }

    const consult = new Consult({
      sender: userId,
      receiver: receiverId,
      messages: [],
      activePost: postId,
    });

    await consult.save();

    return res.json({
      message: 'success',
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Server error', result: error.message });
  }
});

router.get('/account/consult/list', jwtAuthMiddleware, async (req, res) => {
  const { id } = req.user;

  try {
    const findRule = { $or: [{ sender: id }, { receiver: id }] };

    const data = await Consult.find(findRule)
      .populate({
        path: 'activePost',
        select: 'title companyName',
      })
      .sort({ updateDate: -1 })
      .select(
        'sender receiver messages activePost updateDate isSenderRead isReceiverRead',
      );

    return res.json({
      message: 'success',
      result: data,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post(
  '/account/consult/:id/message',
  jwtAuthMiddleware,
  async (req, res) => {
    const { id } = req.user;
    const { id: consultId } = req.params;
    const { content } = req.body;

    try {
      if (!isValidObjectId(consultId)) {
        return res.status(400).json({ message: 'Id格式錯誤' });
      }

      const isExist = await Consult.findById(consultId);
      if (!isExist) {
        return res.status(400).json({ message: '查無此請教紀錄' });
      }

      const payload = {
        sender: id,
        content,
        createDate: Date.now(),
      };

      const data = await Consult.findByIdAndUpdate(
        {
          _id: consultId,
        },
        { $push: { messages: payload } },
        { new: true },
      );

      return res.json({
        message: 'success',
        result: data.messages[data.messages.length - 1],
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

module.exports = router;
