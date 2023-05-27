const express = require('express');
const router = express.Router();
const Post = require('models/Post');
const Company = require('models/Company');
const Keyword = require('models/Keyword');
const Point = require('models/Point');
const axios = require('axios');
const jwtAuthMiddleware = require('middleware/jwtAuthMiddleware');
const partialPostInfosMiddleware = require('middleware/partialPostInfosMiddleware');

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

const formatDate = (date) => {
  return new Date(date).toISOString().substring(0, 10);
};

const findCompanyTypeByTaxId = async (taxId) => {
  const company = await Company.findOne({ taxId });
  return company ? company.type : null;
};

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

const postProjection = {
  title: 1,
  companyName: 1,
  feeling: 1,
  overtime: 1,
};

router.post('/salary/:id/permission', jwtAuthMiddleware, async (req, res) => {
  const postId = req.params.id;
  const userId = req.user.id;

  try {
    const post = await Post.findById(postId).populate('unlockedUsers');

    if (!post) {
      return res.status(404).json({ message: '找不到指定的薪資資訊' });
    }

    const userPoints = await Point.findOne({ user: userId });

    if (!userPoints || userPoints.point < 100) {
      return res.status(400).json({ message: '積分不足' });
    }

    const isUserUnlocked = post.unlockedUsers.some(
      (user) => user.user.toString() === userId,
    );

    if (isUserUnlocked) {
      return res.status(400).json({ message: '使用者已擁有權限' });
    }

    post.unlockedUsers.push({ user: userId, createdAt: new Date() });
    await post.save();

    // TODO: 待討論積分紀錄實作方式，目前先用扣除的方式處理
    userPoints.point -= 100;
    await userPoints.save();

    // const pointRecord = new Point({
    //   user: userId,
    //   point: -100, // TODO: 可設定成 config
    //   remark: `兑換薪水情報：${post.companyName}`,
    //   startDate: new Date(),
    //   endDate: null, // TODO: 確認兑換薪水情報是否有期限
    //   createdAt: new Date(),
    // });
    // await pointRecord.save();

    return res.status(200).json({ message: 'success' });
  } catch (error) {
    return res
      .status(500)
      .json({ message: '伺服器錯誤', result: error.message });
  }
});

router.post(
  '/salary/company/:taxId',
  partialPostInfosMiddleware,
  async (req, res) => {
    const taxId = req.params.taxId;
    const { sort, order, limit, page } = req.query;

    const sortOptions = {};
    if (
      sort &&
      ['createDate', 'yearlySalary', 'workYears', 'feeling'].includes(sort)
    ) {
      sortOptions[sort] = order === 'desc' ? -1 : 1;
    }

    try {
      const posts = await Post.find({ taxId })
        .sort(sortOptions)
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .lean();

      if (!posts) {
        return res.status(404).json({
          message: '找不到該公司的薪水資訊',
          result: [],
        });
      }

      const userId = req.user && req.user.id;
      for (const post of posts) {
        const isLocked =
          !userId ||
          !post.unlockedUsers.some((user) => user.user.equals(userId));
        post.isLocked = isLocked;
        if (isLocked) {
          post.jobDescription = post.jobDescription.substring(0, 10);
          post.suggestion = post.suggestion.substring(0, 10);
        }
      }

      res.status(200).json({
        message: 'success',
        result: posts,
      });
    } catch (error) {
      return res.status(500).json({
        message: '伺服器錯誤',
        result: error.message,
      });
    }
  },
);

router.get('/salary/uniformNumbers/:number', jwtAuthMiddleware, (req, res) => {
  const number = req.params.number;
  const apiUrl = `https://data.gcis.nat.gov.tw/od/data/api/9D17AE0D-09B5-4732-A8F4-81ADED04B679?$format=JSON&$filter=Business_Accounting_NO eq ${number}`;

  axios
    .get(apiUrl)
    .then((response) => {
      const data = response.data;
      if (data.length > 0) {
        const companyName = data[0].Company_Name;
        res.json({
          message: 'success',
          isExist: true,
          companyName: companyName,
        });
      } else {
        res.json({
          message: 'success',
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
      .select('keyword -_id');

    const keywordList = keywords.map((keyword) => keyword.keyword);

    res.json({
      message: 'success',
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
      .limit(15);

    const popularPost = await Post.find({}, postProjection)
      .sort({ seen: -1 })
      .limit(15);

    res.json({ message: 'success', latestPost, popularPost });
  } catch (error) {
    res.status(500).json({
      message: '伺服器錯誤',
      result: error.message,
    });
  }
});

router.get('/salary/search', async (req, res) => {
  const { companyName, type, title, page, limit } = req.query;

  if (
    (companyName && (type || title)) ||
    (type && (companyName || title)) ||
    (title && (companyName || type))
  ) {
    return res.status(400).json({
      message: '只能傳入一個參數 (companyName, type 或 title)',
    });
  }

  const options = {};
  const results = {};

  try {
    if (title) {
      const regex = new RegExp(title, 'i');
      const titleResults = await Post.find({ title: { $regex: regex } })
        .skip((page - 1) * limit)
        .limit(limit);
      results.titleResults = titleResults.map((post) => ({
        postId: post._id,
        title: post.title,
        companyName: post.companyName,
        createDate: formatDate(post.createDate),
        jobDescription: post.jobDescription.substring(0, 10),
        suggestion: post.suggestion.substring(0, 10),
      }));

      options.titleResultsCount = await Post.countDocuments({
        title: { $regex: regex },
      });
    } else if (companyName) {
      const regex = new RegExp(companyName, 'i');
      const companyResultsByCompanyName = await Company.find({
        companyName: { $regex: regex },
      })
        .skip((page - 1) * limit)
        .limit(limit);
      results.companyResults = [];

      for (const company of companyResultsByCompanyName) {
        const latestPosts = await Post.find({ company: company.name })
          .sort({ createDate: -1 })
          .limit(3);
        const latestPostTitles = latestPosts.map((post) => post.title);

        results.companyResults.push({
          companyName: company.companyName,
          taxId: company.taxId,
          latestPostCreateDate:
            latestPosts.length > 0
              ? formatDate(latestPosts[0].createDate)
              : null,
          latestPostTitle: latestPostTitles,
        });
      }

      options.companyResultsCount = companyResultsByCompanyName.length;
    } else if (type) {
      const regex = new RegExp(type, 'i');
      const companyResultsByType = await Company.find({
        type: { $regex: regex },
      })
        .skip((page - 1) * limit)
        .limit(limit);
      results.typeResults = [];

      for (const company of companyResultsByType) {
        const postCount = await Post.countDocuments({
          company: company.name,
        });
        results.typeResults.push({
          companyName: company.companyName,
          taxId: company.taxId,
          type: company.type,
          address: company.address,
          phone: company.phone,
          postCount,
        });
      }

      options.typeResultsCount = companyResultsByType.length;
    }

    res.json({
      message: 'success',
      ...results,
      ...options,
    });
  } catch (error) {
    res.status(500).json({
      message: '伺服器錯誤',
      result: error.message,
    });
  }
});

router.get('/salary/getTopCompanyType', async (req, res) => {
  try {
    const topCompanyTypes = await Company.aggregate([
      { $match: { type: { $ne: '' } } },
      {
        $group: {
          _id: '$type',
          type: { $first: '$type' },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 20 },
      {
        $project: {
          _id: 0,
          type: 1,
          count: 1,
        },
      },
    ]);

    res.json({ message: 'success', companyTypes: topCompanyTypes });
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

    res.json({ message: 'success', companies: topCompanies });
  } catch (error) {
    res.status(500).json({
      message: '伺服器錯誤',
      result: error.message,
    });
  }
});

router.get('/salary/:id', partialPostInfosMiddleware, async (req, res) => {
  const postId = req.params.id;
  const userId = req.user && req.user.id;

  try {
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        message: 'id 格式錯誤或沒有這筆薪資資訊',
        result: [],
      });
    }

    const isLocked =
      !userId || !post.unlockedUsers.some((user) => user.user.equals(userId));

    if (isLocked) {
      const partialPost = {
        jobDescription: post.jobDescription.substring(0, 10),
        suggestion: post.suggestion.substring(0, 10),
        overtime: post.overtime,
        feeling: post.feeling,
        companyName: post.companyName,
        title: post.title,
        city: post.city,
        workYears: post.workYears,
        totalWorkYears: post.totalWorkYears,
        tags: post.tags,
        customTags: post.customTags,
        createDate: post.createDate,
        avgHoursPerDay: post.avgHoursPerDay,
        companyType: await findCompanyTypeByTaxId(post.taxId),
      };

      return res.status(200).json({
        message: 'success',
        result: {
          isLocked: true,
          post: partialPost,
        },
      });
    }

    post.seen += 1;
    await post.save();

    return res.status(200).json({
      message: 'success',
      result: {
        isLocked: false,
        post: {
          companyType: await findCompanyTypeByTaxId(post.taxId),
          ...post.toJSON(),
        },
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
  const userId = req.user.id;
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
      createUser: userId,
      updateUser: userId,
    });
    await company.save();
  } else {
    existingCompany.shared += 1;
    await existingCompany.save();
  }

  const payload = {
    ...req.body,
    createUser: userId,
  };

  const post = new Post(payload);

  try {
    const result = await post.save();
    return res.status(200).json({
      message: 'success',
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
