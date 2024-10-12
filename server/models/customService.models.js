const mongoose = require("mongoose");

const customServiceSchema = mongoose.Schema(
  {
    serviceTitle: {
      type: String,
      required: [true, "Service Title is required"],
    },
    serviceDescription: {
      type: String,
      minlength: 10,
      maxlength: 256,
      required: [true, "Service Description is required"],
    },
    serviceBudget: {
      type: Number,
      min: 1000,
      required: [true, "Service Budget is required"],
    },
    consumer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consumer",
    },
    serviceProviders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ServiceProvider",
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 259200,
    },
  },
  { timestamps: true }
);

const customServiceModel = mongoose.model("CustomService", customServiceSchema);

module.exports = customServiceModel;
