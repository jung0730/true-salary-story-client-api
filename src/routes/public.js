const express = require('express');
const router = express.Router();
const User = require('models/User');
const Post = require('models/Post');

router.get('/statistics', async (req, res, next) => {
  try {
    const numberOfUsers = await User.countDocuments({});
    // If feature count published posts, you should use filter. For example: {status: 'published'}
    const numberOfPosts = await Post.countDocuments({});

    res.json({
      registeredUsers: numberOfUsers,
      publishedPosts: numberOfPosts,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
