const jwt = require("jsonwebtoken");

const createTokenPair = async ({ userID }) => {
  const accessToken = jwt.sign(
    { sub: userID, userID },
    process.env.JWT_SECRET || "your-secret-key",
    { expiresIn: "1d" }
  );

  const refreshToken = jwt.sign(
    { sub: userID, userID },
    process.env.JWT_SECRET || "your-secret-key",
    { expiresIn: "7d" }
  );

  return {
    accessToken,
    refreshToken,
  };
};

const verifyJwt = (token, secret) => {
  return jwt.verify(token, secret);
};

module.exports = {
  createTokenPair,
  verifyJwt,
};
