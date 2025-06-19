const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const userValidation = require("../validations/user.validation");
const validate = require("../middlewares/validate.middleware");
const auth = require("../middlewares/auth.middleware");
const roleConfig = require("../configs/role.config");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.use(auth());

router.post(
  "/change-password",
  validate(userValidation.changePassword),
  userController.changePassword
);

router.get("/me", userController.getMe);

router.patch("/me/avatar", upload.single("image"), userController.changeAvatar);

router.patch(
  "/me/profile",
  validate(userValidation.changeProfile),
  userController.changeProfile
);

router.get("/me/balance", userController.getBalance);

router.get("/:id", userController.getUserInfo);

router.use(auth(roleConfig.ADMIN));

router.get("/", userController.getAllUsers);

router.patch(
  "/:id/profile",
  validate(userValidation.updateUserData),
  userController.changeProfile
);

router.patch("/:id/status", userController.changeStatus);
router.patch("/:id/balance", userController.updateBalance);

module.exports = router;
