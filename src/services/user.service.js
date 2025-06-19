const User = require("../models/user.model");
const bcrypt = require("bcryptjs");
const APIError = require("../utils/APIError");
const userRepo = require("../repositories/user.repo");
const roleConfig = require("../configs/role.config");
const _ = require("lodash");
const imgurService = require("./imgur.service");
class UserService {
  changePassword = async ({ userID, oldPassword, newPassword }) => {
    const user = await User.findById(userID);
    const isPasswordMatch = await bcrypt.compare(oldPassword, user.password);

    if (!isPasswordMatch) {
      throw new APIError(400, "Old password is incorrect");
    }

    user.password = newPassword;
    await user.save();

    return user;
  };

  getAllUsers = async (query) => {
    const { sortBy, limit, page, fields, q, ...filter } = query;

    const newFilter = _.pick(filter, [
      "_id",
      "email",
      "firstName",
      "lastName",
      "isVerified",
      "isActive",
      "role",
    ]);

    return await userRepo.getAll(newFilter, {
      sortBy,
      limit: limit ?? 20,
      page: page ?? 1,
      fields,
      allowSearchFields: ["email", "firstName", "lastName"],
      q: q ?? "",
    });
  };

  getUserInfo = async (id) => {
    return await User.findById(id);
  };

  changeProfileInfo = async (userID, data) => {
    let updateData = _.omit(data, [
      "password",
      "email",
      "_id",
      "role",
      "isVerified",
      "isActive",
    ]);

    return await User.findOneAndUpdate({ _id: userID }, updateData, {
      new: true,
      runValidators: true,
    });
  };

  changeStatus = async (userId, statusData) => {
    const user = await User.findById(userId);
    if (!user) {
      throw new APIError(404, "User not found");
    }

    const updateData = {};
    if (statusData.isActive !== undefined) {
      updateData.isActive = statusData.isActive;
    }
    if (statusData.isVerified !== undefined) {
      updateData.isVerified = statusData.isVerified;
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: userId },
      updateData,
      { new: true }
    );

    return {
      message: "User status changed successfully",
      user: updatedUser,
    };
  };

  changeAvatar = async ({ userID, imageFile }) => {
    if (!imageFile) {
      throw new APIError(400, "Image file is required");
    }

    const avatarLink = await imgurService.uploadImage(imageFile);

    return await User.findOneAndUpdate(
      { _id: userID },
      { avatar: avatarLink },
      { new: true }
    );
  };

  getBalance = async (userID) => {
    const user = await User.findById(userID).select("balance");
    if (!user) {
      throw new APIError(404, "User not found");
    }
    return { balance: user.balance };
  };

  updateBalance = async (userID, amount) => {
    const user = await User.findById(userID);
    if (!user) {
      throw new APIError(404, "User not found");
    }

    user.balance += amount;
    await user.save();

    return { balance: user.balance };
  };
}

module.exports = new UserService();
