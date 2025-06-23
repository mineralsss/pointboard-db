const { Schema, model } = require("mongoose");
const role = require("../configs/role.config");
const bcrypt = require("bcryptjs");
const userSchema = new Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      unique: true,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    dob: {
      type: Date,
    },
    avatar: {
      type: String,
      default:
        "https://www.strasys.uk/wp-content/uploads/2022/02/Depositphotos_484354208_S.jpg",
    },
    balance: {
      type: Number,
      default: 0,
    },
    certificate: {
      type: [String],
      default: [],
    },
    password: {
      type: String,
      required: true,
      trim: true,
      minLength: 8,
      private: true, // used by the toJSON plugin
    },
    role: {
      type: String,
      enum: Object.values(role),
      default: role.STUDENT,
      trim: true,
      lowercase: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    resetPasswordCode: {
      type: String,
      select: false, // Don't include in queries by default
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
    resetPasswordToken: {
      type: String,
      select: false, // Don't include in queries by default
    },
    resetPasswordTokenExpires: {
      type: Date,
      select: false,
    },
    emailVerificationToken: {
      type: String,
      select: false, // Don't include in queries by default
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.plugin(require("./plugins/toJSON.plugin"));
userSchema.plugin(require("./plugins/paginate.plugin"));

userSchema.pre("save", async function (next) {
  const user = this;
  if (user.isModified("password")) {
    user.password = await bcrypt.hash(user.password, 8);
  }
  next();
});

const User = model("User", userSchema);
module.exports = User;
