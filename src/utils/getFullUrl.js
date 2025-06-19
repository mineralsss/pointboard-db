// Request Object of Express

module.exports = (req) => {
  return req.protocol + '://' + req.get('host') + req.originalUrl;
};
