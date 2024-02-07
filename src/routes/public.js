const express = require('express');
const router = express.Router();
const User = require('models/User');
const Post = require('models/Post');
const successHandler = require('middleware/successHandler');

router.get('/statistics', async (req, res, next) => {
  try {
    const numberOfUsers = await User.countDocuments({});
    // If feature count published posts, you should use filter. For example: {status: 'published'}
    const numberOfPosts = await Post.countDocuments({});

    successHandler(res, {
      registeredUsers: numberOfUsers,
      publishedPosts: numberOfPosts,
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
