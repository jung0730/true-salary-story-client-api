const jwt = require('jsonwebtoken');
const User = require('models/User');
const config = require('config');

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return next({
      statusCode: 401,
      message: 'No token provided',
    });
  }

  const token = authHeader.split(' ')[1];
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
    next({
      statusCode: 401,
      message: 'Invalid token',
    });
  }
};
