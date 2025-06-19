const passport = require("passport");
const { Strategy: JwtStrategy, ExtractJwt } = require("passport-jwt");
const User = require("../models/user.model");
const APIError = require("../utils/APIError");
const RoleConfig = require("../configs/role.config");
const logger = require("../configs/logger.config");

const jwtOptions = {
  secretOrKey: process.env.JWT_SECRET || "your-secret-key",
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
};

const jwtVerify = async (payload, done) => {
  try {
    const user = await User.findById(payload.sub);
    if (user) {
      done(null, user);
    } else {
      done(null, false);
    }
  } catch (error) {
    done(error, false);
  }
};

const jwtStrategy = new JwtStrategy(jwtOptions, jwtVerify);
passport.use(jwtStrategy);

const verifyCallback =
  (req, resolve, reject, roles) => async (err, user, info) => {
    if (err || info || !user) {
      if (
        info.name === "JsonWebTokenError" ||
        info.name === "TokenExpiredError"
      ) {
        return reject(new APIError(401, "Invalid token or expired"));
      }

      return reject(new APIError(401, "Please authenticate"));
    }

    if (!user.isActive) {
      return reject(new APIError(400, "Your account has been blocked"));
    }

    if (!user.isVerified) {
      return reject(new APIError(400, "Your account has not been verified"));
    }

    req.user = user;
    req.isAdmin = user?.role === RoleConfig.ADMIN;

    if (!roles.includes(user.role) && roles.length) {
      return reject(new APIError(403, "You do not have permission"));
    }

    resolve();
  };

const auth =
  (...roles) =>
  async (req, res, next) => {
    return new Promise((resolve, reject) => {
      passport.authenticate(
        "jwt",
        { session: false },
        verifyCallback(req, resolve, reject, roles)
      )(req, res, next);
    })
      .then(() => next())
      .catch((err) => next(err));
  };

module.exports = auth;
