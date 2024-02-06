const successHandler = (res, message, data) => {
  res.json({
    status: 'success',
    message,
    data,
  });
};

module.exports = successHandler;
