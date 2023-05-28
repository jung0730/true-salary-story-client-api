const jwt = require('jsonwebtoken');
const config = require('config');
const User = require('models/User');

const partialPostInfosMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(decoded.id);

    if (
      user.logoutTimestamp &&
      decoded.iat * 1000 < user.logoutTimestamp.getTime()
    ) {
      return res.status(401).json({
        status: 'error',
        message: 'Token is expired',
        data: null,
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error(error);
  }
};

module.exports = partialPostInfosMiddleware;
