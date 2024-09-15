const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const serviceProviderSchema = mongoose.Schema(
  {
    serviceProviderFullName: {
      type: String,
      required: [true, "ServiceProvider full name is required"],
    },
    serviceProviderEmail: {
      type: String,
      unique: [true, "ServiceProvider email should be unique"],
      lowercase: true,
      validate: {
        validator: function (v) {
          return /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(v);
        },
        message: "Email is not valid",
      },
      required: [true, "ServiceProvider email is required"],
    },
    serviceProviderPassword: {
      type: String,
      minlength: [
        8,
        "ServiceProvider password should be greater than or equal to 8",
      ],
      validate: {
        validator: function (v) {
          return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(v);
        },
        message:
          "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      },
      required: [true, "ServiceProvider password is required"],
      select: false,
    },
    serviceProviderPhoneNumber: {
      type: String,
      validate: {
        validator: function (v) {
          return /^[+]*\d{12}/.test(v);
        },
        message:
          "Phone number should be a valid 12-digit number (+92xxxxxxxxxx)",
      },
    },
    serviceProviderAvatar: String,
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    serviceProviderAddress: String,
    serviceProviderCNICImages: [String],
    serviceProviderListedServices: [
      {
        service: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Service",
        },
      },
    ],
    serviceProviderWorkingHours: [
      {
        dayOfWeek: String,
        time: String,
      },
    ],
    isAccountVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

serviceProviderSchema.pre("save", async function (next) {
  try {
    if (!this.isModified("serviceProviderPassword")) return next();
    this.serviceProviderPassword = await bcrypt.hash(
      this.serviceProviderPassword,
      10
    );
    next();
  } catch (error) {
    next(error);
  }
});

const serviceProviderModel = mongoose.model(
  "ServiceProvider",
  serviceProviderSchema
);

module.exports = serviceProviderModel;
