const User = require("../models/user.model");
const APIError = require("../utils/APIError");
const userRepo = require("../repositories/user.repo");
const { createTokenPair } = require("../utils/token");
const _ = require("lodash");
const bcrypt = require("bcryptjs");
const { verifyJwt } = require("../utils/token");
const config = require("../configs/app.config");
class AuthService {
  register = async ({
    email,
    password,
    firstName,
    lastName,
    role,
    address,
    phone,
    dob,
  }) => {
    const isExist = await userRepo.getByEmail(email);
    if (isExist) {
      throw new APIError(400, "Email already exists");
    }

    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      role,
      address,
      phone,
      dob,
      isVerified: true, // Auto-verify for now
    });

    return {
      message: "User registered successfully.",
      user: _.pick(user, ["_id", "email", "firstName", "lastName", "role"]),
    };
  };

  loginWithEmail = async ({ email, password }) => {
    const user = await userRepo.getByEmail(email);
    if (!user) {
      throw new APIError(400, "Email does not exist");
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      throw new APIError(400, "Email or password is incorrect");
    }

    if (!user.isActive) {
      throw new APIError(400, "Your account has been blocked");
    }

    const tokens = await createTokenPair({
      userID: user._id,
    });
    return {
      ...tokens,
      userData: _.pick(user, [
        "_id",
        "email",
        "firstName",
        "lastName",
        "role",
        "avatar",
        "balance",
      ]),
    };
  };

  generateNewTokens = async (refreshToken) => {
    const decodedJwt = verifyJwt(refreshToken, config.JWT.secretKey);

    const tokens = await createTokenPair({
      userID: decodedJwt.userID,
    });
    return tokens;
  };
}
module.exports = new AuthService();

