const mongoose = require("mongoose");

const serviceProviderSchema = mongoose.Schema(
  {
    serviceProviderFullName: {
      type: String,
      required: [true, "serviceProvider full name is required"],
    },
    serviceProviderEmail: {
      type: String,
      unique: [true, "serviceProvider email should be unique"],
      lowercase: true,
      validate: {
        validator: function (v) {
          return /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(v);
        },
        message: "email is not valid",
      },
      required: [true, "serviceProvider email is required"],
    },
    serviceProviderPassword: {
      type: String,
      minlength: [
        8,
        "serviceProvider password should be greater than or equal to 8",
      ],
      validate: {
        validator: function (v) {
          return /^[a-zA-Z0-9]+$/.test(v);
        },
        message: "Password should contain only letters and numbers",
      },
      required: [true, "serviceProvider password is required"],
      select: false,
    },
    serviceProviderPhoneNumber: {
      type: String,
      validate: {
        validator: function (v) {
          return /^[+]*\d{12}/.test(v);
        },
        message:
          "phone number should be a valid 12-digit number (+92xxxxxxxxxx)",
      },
    },
    serviceProviderAvatar: String,
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    serviceProviderAddress: String,
    serviceProviderCNICNumber: {
      type: String,
      validate: {
        validator: function (v) {
          return /\d{5}-\d{7}-\d{1}/.test(v);
        },
        message: "CNIC number should be in the format 'xxxxx-xxxxxx-x'",
      },
    },
    serviceProviderCNICImages: [String],
    serviceProviderListedServices: [
      {
        service: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Service",
        },
      },
    ],
    serviceProviderPostedServices: [
      {
        service: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ServicePost",
        },
      },
    ],
    serviceProviderWorkingHours: [String],
    isAccountVerified: {
      type: Boolean,
      default: false,
    },
    serviceProviderMessages: [
      {
        message: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Message",
        },
      },
    ],
    serviceProviderNotifications: [
      {
        notification: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Notification",
        },
      },
    ],
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
