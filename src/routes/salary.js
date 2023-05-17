const express = require('express');
const router = express.Router();
const Post = require('models/Post');
const mongoose = require('mongoose');
const axios = require('axios');
const isValidObjectId = mongoose.Types.ObjectId.isValid;

const jwt = require('jsonwebtoken');

const getUserIdFromJWT = (req) => {
  const token = req.headers.authorization.split(' ')[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  return decoded.id;
};

const jwtAuthMiddleware = require('middleware/jwtAuthMiddleware');

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

const postProjection = {
  _id: 0,
  postId: '$_id',
  title: 1,
  companyName: 1,
  feeling: 1,
  overtime: 1,
};

router.get('/salary/uniformNumbers/:number', (req, res) => {
  const number = req.params.number;
  const apiUrl = `https://data.gcis.nat.gov.tw/od/data/api/9D17AE0D-09B5-4732-A8F4-81ADED04B679?$format=JSON&$filter=Business_Accounting_NO eq ${number}`;

  axios
    .get(apiUrl)
    .then((response) => {
      const data = response.data;
      if (data.length > 0) {
        const companyName = data[0].Company_Name;
        res.json({
          message: '成功',
          isExist: true,
          companyName: companyName,
        });
      } else {
        res.json({
          message: '成功',
          isExist: false,
          companyName: '',
        });
      }
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({ error: 'An error occurred' });
    });
});

router.get('/salary/getTopPost', async (req, res) => {
  try {
    const latestPost = await Post.find({}, postProjection)
      .sort({ createDate: -1 })
      .limit(15)
      .exec();

    const popularPost = await Post.find({}, postProjection)
      .sort({ seen: -1 })
      .limit(15)
      .exec();

    res.json({ message: '成功', latestPost, popularPost });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/salary/getTopCompany', async (req, res) => {
  try {
    const topCompanies = await Post.aggregate([
      { $match: { status: 'approved' } },
      {
        $group: {
          _id: '$taxId',
          taxId: { $first: '$taxId' },
          companyName: { $first: '$companyName' },
          postCount: { $sum: 1 },
        },
      },
      { $sort: { postCount: -1 } },
      { $limit: 30 },
      {
        $project: {
          _id: 0,
          taxId: 1,
          companyName: 1,
          postCount: 1,
        },
      },
    ]);

    res.json({ message: '成功', companies: topCompanies });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/salary/:id', async (req, res) => {
  const id = req.params.id;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'id 格式錯誤' });
  }

  try {
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({
        message: 'Post not found',
        result: [],
      });
    }

    return res.status(200).json({
      message: 'Success',
      result: post,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Server error',
      result: [],
    });
  }
});

router.post('/salary', jwtAuthMiddleware, async (req, res) => {
  const payload = {
    ...req.body,
    createUser: getUserIdFromJWT(req),
  };

  const post = new Post(payload);

  try {
    const result = await post.save();
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

module.exports = router;
