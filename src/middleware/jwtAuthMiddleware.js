const jwt = require('jsonwebtoken');
const User = require('models/User');
const config = require('config');

module.exports = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (token == null || token === '') {
    return next({
      statusCode: 401,
      message: 'No token provided',
    });
  }
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(decoded.id);

    // Check if the token was issued before the logout timestamp
    if (
      user.logoutTimestamp &&
      decoded.iat * 1000 < user.logoutTimestamp.getTime()
    ) {
      return next({
        statusCode: 401,
        message: 'Token is expired',
      });
    }
    req.user = user;
    next();
  } catch (error) {
    return next({
      statusCode: 401,
      message: 'Invalid token',
    });
  }
};
