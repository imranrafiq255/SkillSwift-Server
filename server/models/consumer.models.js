const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const consumerSchema = mongoose.Schema(
  {
    consumerFullName: {
      type: String,
      required: [true, "Consumer full name is required"],
    },
    consumerEmail: {
      type: String,
      unique: [true, "Consumer email should be unique"],
      lowercase: true,
      validate: {
        validator: function (v) {
          return /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(v);
        },
        message: "email is not valid",
      },
      required: [true, "Consumer email is required"],
    },
    consumerPassword: {
      type: String,
      minlength: [8, "Consumer password should be greater than or equal to 8"],
      validate: {
        validator: function (v) {
          return /^[a-zA-Z0-9]+$/.test(v);
        },
        message: "Password should contain only letters and numbers",
      },
      required: [true, "Consumer password is required"],
      select: false,
    },
    consumerPhoneNumber: {
      type: String,
      validate: {
        validator: function (v) {
          return /^[+]*\d{12}/.test(v);
        },
        message:
          "phone number should be a valid 12-digit number (+92xxxxxxxxxx)",
      },
    },
    consumerAvatar: String,
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    consumerAddress: String,
    consumerOrders: [
      {
        service: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ServiceOrder",
        },
      },
    ],
    consumerFiledDisputes: [
      {
        dispute: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Dispute",
        },
      },
    ],
    consumerRatedServicePosts: [
      {
        servicePost: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ServicePost",
        },
      },
    ],
    consumerFavoriteServicePosts: [
      {
        servicePost: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ServicePost",
        },
      },
    ],
    consumerMessages: [
      {
        message: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Message",
        },
      },
    ],
    consumerNotifications: [
      {
        notification: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Notification",
        },
      },
    ],
    consumerTokenVersion: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

consumerSchema.pre("save", async function (next) {
  try {
    if (!this.isModified("consumerPassword")) return next();
    this.consumerPassword = await bcrypt.hash(this.consumerPassword, 10);
    next();
  } catch (error) {
    next(error);
  }
});
const consumerModel = mongoose.model("Consumer", consumerSchema);

module.exports = consumerModel;
