const successHandler = (res, data) => {
  res.json({
    status: 'success',
    data,
  });
};

module.exports = successHandler;
