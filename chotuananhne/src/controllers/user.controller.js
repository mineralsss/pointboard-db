const { OK } = require("../configs/response.config");
const roleConfig = require("../configs/role.config");
const userService = require("../services/user.service");
const catchAsync = require("../utils/catchAsync");

class UserController {
  changePassword = catchAsync(async (req, res) => {
    return OK(
      res,
      "Your password has been changed successfully",
      await userService.changePassword({
        ...req.body,
        userID: req.user.id,
      })
    );
  });

  getUserInfo = catchAsync(async (req, res) => {
    return OK(
      res,
      "Success",
      await userService.getUserInfo(
        req?.user.role === roleConfig.ADMIN && req.params?.id
          ? req.params.id
          : req.user._id
      )
    );
  });

  getMe = catchAsync(async (req, res) => {
    return OK(res, "Success", await userService.getUserInfo(req.user._id));
  });

  getAllUsers = catchAsync(async (req, res) => {
    return OK(res, "Success", await userService.getAllUsers(req.query));
  });

  changeProfile = catchAsync(async (req, res) => {
    return OK(
      res,
      "Your profile has been changed successfully",
      await userService.changeProfileInfo(
        req.isAdmin ? req.params.id : req.user._id,
        req.body
      )
    );
  });

  changeAvatar = catchAsync(async (req, res) => {
    return OK(
      res,
      "Your avatar has been changed successfully",
      await userService.changeAvatar({
        userID: req.user._id,
        imageFile: req.file,
      })
    );
  });

  changeCertificates = catchAsync(async (req, res) => {
    return OK(
      res,
      "Your certificates has been changed successfully",
      await userService.changeCertificates({
        userID: req.user._id,
        files: req.files,
      })
    );
  });

  updateCertificate = catchAsync(async (req, res) => {
    return OK(
      res,
      "Certificate updated successfully",
      await userService.updateCertificate({
        userID: req.user._id,
        certificate: req.body.certificate,
      })
    );
  });

  getBalance = catchAsync(async (req, res) => {
    return OK(res, "Success", await userService.getBalance(req.user._id));
  });

  updateBalance = catchAsync(async (req, res) => {
    return OK(
      res,
      "Balance updated successfully",
      await userService.updateBalance(req.params.id, req.body.amount)
    );
  });

  changeStatus = catchAsync(async (req, res) => {
    return OK(
      res,
      "Success",
      await userService.changeStatus(req.params.id, req.body)
    );
  });
}

module.exports = new UserController();
