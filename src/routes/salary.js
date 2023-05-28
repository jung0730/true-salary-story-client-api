const express = require('express');
const router = express.Router();
const Post = require('models/Post');
const Company = require('models/Company');
const Keyword = require('models/Keyword');
const Point = require('models/Point');
const PointHistory = require('models/PointHistory');
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

const getMostFrequentValue = (obj) => {
  let mostFrequentValue = '';
  let maxCount = 0;

  for (const key in obj) {
    if (obj[key] > maxCount) {
      mostFrequentValue = key;
      maxCount = obj[key];
    }
  }

  return mostFrequentValue;
};

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

const postProjection = {
  title: 1,
  companyName: 1,
  feeling: 1,
  overtime: 1,
};

router.get('/salary/company/:taxId/infos', async (req, res) => {
  const taxId = req.params.taxId;

  try {
    const posts = await Post.find({ taxId, status: 'approved' });

    const postCount = posts.length;

    let feelingStats = {};
    let overtimeStats = {};
    let totalMonthlySalary = 0;

    posts.forEach((post) => {
      const { feeling, overtime, monthlySalary } = post;

      if (feelingStats[feeling]) {
        feelingStats[feeling] += 1;
      } else {
        feelingStats[feeling] = 1;
      }

      if (overtimeStats[overtime]) {
        overtimeStats[overtime] += 1;
      } else {
        overtimeStats[overtime] = 1;
      }

      totalMonthlySalary += monthlySalary;
    });

    const avgMonthlySalary =
      postCount > 0 ? Math.round(totalMonthlySalary / postCount) : 0;

    const result = {
      companyName: posts.length ? posts[0].companyName : '',
      feeling: getMostFrequentValue(feelingStats),
      overtime: getMostFrequentValue(overtimeStats),
      avgMonthlySalary,
      postCount,
    };

    res.status(200).json({
      message: 'success',
      result,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
      result: error.message,
    });
  }
});

router.get('/salary/company/:taxId/title', async (req, res) => {
  const taxId = req.params.taxId;

  try {
    const posts = await Post.aggregate([
      { $match: { taxId, status: 'approved' } },
      { $group: { _id: '$title', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    if (!posts || posts.length === 0) {
      return res.status(404).json({
        message: '找不到該公司的職位資訊',
        result: [],
      });
    }

    const titles = posts.map((post) => post._id);

    res.status(200).json({
      message: 'success',
      result: titles,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Server error',
      result: error.message,
    });
  }
});

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

    userPoints.point -= 100;
    await userPoints.save();

    const pointHistory = new PointHistory({
      user: userId,
      point: -100, // TODO: 可設定成 config
      remark: `兑換薪水情報：${post.companyName} - ${post.title}`,
      startDate: new Date(),
      endDate: null,
    });
    await pointHistory.save();

    return res.status(200).json({
      message: 'success',
      result: { isLocked: false, postId },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Server error', result: error.message });
  }
});

router.get(
  '/salary/company/:taxId',
  partialPostInfosMiddleware,
  async (req, res) => {
    const taxId = req.params.taxId;
    const { titleOption, sortOption, limit, page } = req.query;

    let sortOptions = {};
    if (sortOption) {
      switch (sortOption) {
        case '1':
          sortOptions = { createDate: -1 };
          break;
        case '2':
          sortOptions = { yearlySalary: -1 };
          break;
        case '3':
          sortOptions = { workYears: -1 };
          break;
        case '4':
          sortOptions = { feelings: 1 };
          break;
      }
    }

    try {
      const query = { taxId };
      if (titleOption && titleOption !== '全部') {
        const titles = titleOption.split(',');
        query.title = { $in: titles.map((title) => new RegExp(title, 'i')) };
      }

      const posts = await Post.find(query)
        .sort(sortOptions)
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit));

      if (!posts || posts.length === 0) {
        return res.status(404).json({
          message: '找不到該公司的薪水資訊',
          result: [],
        });
      }

      const userId = req.user && req.user.id;
      const result = posts.map((post) => {
        const isLocked =
          !userId ||
          !post.unlockedUsers.some((user) => user.user.equals(userId));
        if (isLocked) {
          post.jobDescription = post.jobDescription.substring(0, 10);
          post.suggestion = post.suggestion.substring(0, 10);
        }
        return { ...post.toJSON(), isLocked };
      });

      res.status(200).json({
        message: 'success',
        result,
      });
    } catch (error) {
      return res.status(500).json({
        message: 'Server error',
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
        message: 'Server error',
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
      message: 'Server error',
      result: error.message,
    });
  }
});

router.get('/salary/getTopPost', async (req, res) => {
  try {
    const latestPost = await Post.find({ status: 'approved' }, postProjection)
      .sort({ createDate: -1 })
      .limit(15);

    const popularPost = await Post.find({ status: 'approved' }, postProjection)
      .sort({ seen: -1 })
      .limit(15);

    res.json({ message: 'success', latestPost, popularPost });
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
      result: error.message,
    });
  }
});

router.get('/salary/search', async (req, res) => {
  const { companyName, type, title, keyword, limit, page } = req.query;
  const perPage = parseInt(limit) || 10;
  const currentPage = parseInt(page) || 1;

  const options = {};
  const results = {};

  try {
    if (title) {
      const regex = new RegExp(title, 'i');
      const titleResults = await Post.find({
        title: { $regex: regex },
        status: 'approved',
      })
        .skip((currentPage - 1) * perPage)
        .limit(perPage);

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
        status: 'approved',
      });
    }

    if (companyName) {
      const regex = new RegExp(companyName, 'i');
      const posts = await Post.find({
        companyName: { $regex: regex },
        status: 'approved',
      });

      const groupedPosts = {};
      const companyNames = [];

      for (const post of posts) {
        if (!groupedPosts[post.companyName]) {
          groupedPosts[post.companyName] = [];
          companyNames.push(post.companyName);
        }
        if (groupedPosts[post.companyName].length < 3) {
          if (!groupedPosts[post.companyName].includes(post.title)) {
            groupedPosts[post.companyName].push(post.title);
          }
        }
      }

      const companyResults = await Company.find({
        companyName: { $regex: regex },
      });

      const formattedResults = companyResults.map((company) => {
        const nextPost = posts.find(
          (post) => post.companyName === company.companyName,
        );
        const latestPostCreateDate = nextPost ? nextPost.createDate : null;
        return {
          companyName: company.companyName,
          taxId: company.taxId,
          latestPostCreateDate,
          latestPostTitle: groupedPosts[company.companyName],
        };
      });

      const startIndex = (currentPage - 1) * perPage;
      const endIndex = startIndex + perPage;
      const pagedResults = formattedResults.slice(startIndex, endIndex);

      results.companyResults = pagedResults;
      options.companyResultsCount = companyResults.length;
    }

    if (type) {
      const regex = new RegExp(type, 'i');
      const companyResultsByType = await Company.find({
        type: { $regex: regex },
      })
        .skip((currentPage - 1) * perPage)
        .limit(perPage);

      results.typeResults = [];

      for (const company of companyResultsByType) {
        const postCount = await Post.countDocuments({
          companyName: company.companyName,
          status: 'approved',
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

      options.typeResultsCount = await Company.countDocuments({
        type: { $regex: regex },
      });
    }

    if (keyword) {
    }

    res.json({
      message: 'success',
      ...results,
      ...options,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
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
      message: 'Server error',
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
      message: 'Server error',
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
        isLocked: true,
      };

      return res.status(200).json({
        message: 'success',
        result: partialPost,
      });
    }

    post.seen += 1;
    await post.save();

    return res.status(200).json({
      message: 'success',
      result: {
        isLocked: false,
        companyType: await findCompanyTypeByTaxId(post.taxId),
        ...post.toJSON(),
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Server error',
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
    const userPoints = await Point.findOne({ user: userId });
    const result = await post.save();

    userPoints.point += 200; // TODO 可設定成 config
    await userPoints.save();

    const currentDate = new Date();
    const endDate = new Date(currentDate.getTime());
    endDate.setFullYear(endDate.getFullYear() + 1);

    const pointHistory = new PointHistory({
      user: userId,
      point: 200,
      remark: `分享薪水情報：${post.companyName} - ${post.title}`,
      startDate: currentDate,
      endDate,
    });
    await pointHistory.save();
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
      message: 'Server error',
      result: error.message,
    });
  }
});

module.exports = router;
