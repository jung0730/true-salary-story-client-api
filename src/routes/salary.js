const express = require('express');
const router = express.Router();
const Post = require('models/Post');
const Company = require('models/Company');
const Keyword = require('models/Keyword');
const mongoose = require('mongoose');
const axios = require('axios');
const isValidObjectId = mongoose.Types.ObjectId.isValid;

const jwt = require('jsonwebtoken');

const getCompanyAddress = async (taxId) => {
  const companyAddress = await axios
    .get(
      `https://data.gcis.nat.gov.tw/od/data/api/5F64D864-61CB-4D0D-8AD9-492047CC1EA6?$format=json&$filter=Business_Accounting_NO eq ${taxId}`,
    )
    .then((response) => {
      const data = response.data;
      return data[0].Company_Location;
    });
  return companyAddress;
};
const getCompanyType = async (taxId) => {
  const companyType = await axios
    .get(
      `https://data.gcis.nat.gov.tw/od/data/api/236EE382-4942-41A9-BD03-CA0709025E7C?$format=json&$filter=Business_Accounting_NO eq ${taxId}/`,
    )
    .then((response) => {
      const data = response.data;
      return data[0].Cmp_Business[0].Business_Item_Desc;
    });
  return companyType;
};

const getUserIdFromJWT = (req) => {
  const token = req.headers.authorization.split(' ')[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  return decoded.id;
};

const formatDate = (date) => {
  return new Date(date).toISOString().substring(0, 10);
};

const findCompanyTypeByTaxId = async (taxId) => {
  const company = await Company.findOne({ taxId });
  return company ? company.type : null;
};

const jwtAuthMiddleware = require('middleware/jwtAuthMiddleware');

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

const postProjection = {
  title: 1,
  companyName: 1,
  feeling: 1,
  overtime: 1,
};

router.post('/salary/:id/permission', async (req, res) => {
  const postId = req.params.id;
  const userId = getUserIdFromJWT(req);

  try {
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: '找不到指定的薪資資訊' });
    }

    if (post.unlockedUsers.includes(userId)) {
      return res.status(400).json({ message: '使用者已擁有權限' });
    }

    post.unlockedUsers.push(userId);
    await post.save();

    return res.status(200).json({ message: '成功' });
  } catch (error) {
    return res
      .status(500)
      .json({ message: '伺服器錯誤', result: error.message });
  }
});

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
      res.status(500).json({
        message: '伺服器錯誤',
        result: error.message,
      });
    });
});

router.get('/salary/getTopKeyword', async (req, res) => {
  try {
    const keywords = await Keyword.find({})
      .sort({ rank: 1 })
      .limit(25)
      .select('keyword -_id')
      .exec();

    const keywordList = keywords.map((keyword) => keyword.keyword);

    res.json({
      message: '成功',
      keywords: keywordList,
    });
  } catch (error) {
    res.status(500).json({
      message: '伺服器錯誤',
      result: error.message,
    });
  }
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
    res.status(500).json({
      message: '伺服器錯誤',
      result: error.message,
    });
  }
});

router.get('/salary/search', async (req, res) => {
  const { companyName, type, title } = req.query;
  const titleResults = [];
  const companyResults = [];
  const typeResults = [];

  try {
    if (title) {
      const regex = new RegExp(title, 'i');
      const postResults = await Post.find({ title: { $regex: regex } }).exec();
      titleResults.push(
        ...postResults.map((post) => ({
          postId: post._id,
          title: post.title,
          companyName: post.companyName,
          createDate: formatDate(post.createDate),
        })),
      );

      const companyResultsByPost = await Company.find({
        _id: { $in: postResults.map((post) => post.company) },
      }).exec();
      for (const company of companyResultsByPost) {
        const latestPost = postResults.find(
          (post) => post.company.toString() === company._id.toString(),
        );
        const latestPostTitle = latestPost ? latestPost.title : null;
        companyResults.push({
          companyName: company.companyName,
          taxId: company.taxId,
          latestPostCreateDate: latestPost ? latestPost.createDate : null,
          latestPostTitle: latestPostTitle ? [latestPostTitle] : [],
        });
      }
    }

    if (companyName) {
      const regex = new RegExp(companyName, 'i');
      const companyResultsByCompanyName = await Company.find({
        companyName: { $regex: regex },
      }).exec();
      for (const company of companyResultsByCompanyName) {
        const latestPost = await Post.findOne({ company: company._id })
          .sort({ createDate: -1 })
          .exec();
        const latestPostTitle = latestPost ? latestPost.title : null;
        companyResults.push({
          companyName: company.companyName,
          taxId: company.taxId,
          latestPostCreateDate: latestPost
            ? formatDate(latestPost.createDate)
            : null,
          latestPostTitle: latestPostTitle ? [latestPostTitle] : [],
        });
      }
    }

    if (type) {
      const regex = new RegExp(type, 'i');
      const companyResultsByType = await Company.find({
        type: { $regex: regex },
      }).exec();
      for (const company of companyResultsByType) {
        const postCount = await Post.countDocuments({
          company: company._id,
          status: 'approved',
        }).exec();
        typeResults.push({
          companyName: company.companyName,
          taxId: company.taxId,
          type: company.type,
          address: company.address,
          phone: company.phone,
          postCount: postCount.toString(),
        });
      }
    }

    const titleResultsCount = titleResults.length;
    const companyResultsCount = companyResults.length;
    const typeResultsCount = typeResults.length;

    res.json({
      message: '成功',
      titleResults,
      companyResults,
      typeResults,
      titleResultsCount,
      companyResultsCount,
      typeResultsCount,
    });
  } catch (error) {
    res.status(500).json({
      message: '伺服器錯誤',
      result: error.message,
    });
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
          taxId: 1,
          companyName: 1,
          postCount: 1,
        },
      },
    ]);

    res.json({ message: '成功', companies: topCompanies });
  } catch (error) {
    res.status(500).json({
      message: '伺服器錯誤',
      result: error.message,
    });
  }
});

router.get('/salary/:id', async (req, res) => {
  const id = req.params.id;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'id 格式錯誤或沒有這筆薪資資訊' });
  }

  try {
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({
        message: 'id 格式錯誤或沒有這筆薪資資訊',
        result: [],
      });
    }

    post.seen += 1;
    await post.save();

    return res.status(200).json({
      message: '成功',
      result: {
        companyType: await findCompanyTypeByTaxId(post.taxId),
        ...post.toJSON(),
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: '伺服器錯誤',
      result: error.message,
    });
  }
});

router.post('/salary', jwtAuthMiddleware, async (req, res) => {
  const { taxId, companyName } = req.body;
  const existingCompany = await Company.findOne({ taxId });
  if (!existingCompany) {
    const company = new Company({
      companyName,
      taxId,
      type: await getCompanyType(taxId),
      address: await getCompanyAddress(taxId),
      photo: 'https://true-salary-story.s3.amazonaws.com/logo.png', // TODO 依照公司相關取得 logo
      phone: '0222345678', // TODO 看看有沒有其他方式可取得公司電話
      shared: 1,
      createUser: getUserIdFromJWT(req),
      updateUser: getUserIdFromJWT(req),
    });
    await company.save();
  } else {
    existingCompany.shared += 1;
    await existingCompany.save();
  }

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
          point: 200, // TODO: 依照積分規則調整
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
    return res.status(500).json({
      message: '伺服器錯誤',
      result: error.message,
    });
  }
});

module.exports = router;
