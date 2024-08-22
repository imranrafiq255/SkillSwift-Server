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
          return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(v);
        },
        message: (props) => {
          if (!/(?=.*[a-z])/.test(props.value))
            return "Password must contain at least one lowercase letter";
          if (!/(?=.*[A-Z])/.test(props.value))
            return "Password must contain at least one uppercase letter";
          if (!/(?=.*\d)/.test(props.value))
            return "Password must contain at least one number";
          if (!/(?=.*[\W_])/.test(props.value))
            return "Password must contain at least one special character";
          return "Invalid password";
        },
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
    consumerFavoriteServicePosts: [
      {
        servicePost: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ServicePost",
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
