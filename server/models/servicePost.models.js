const mongoose = require("mongoose");

const servicePostSchema = mongoose.Schema(
  {
    serviceName: {
      type: String,
      required: [true, "Service name is required"],
      minlength: 3,
      maxlength: 50,
    },
    serviceProvider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceProvider",
      required: [true, "Service provider id is required"],
    },
    servicePostMessage: {
      type: String,
      required: [true, "Service post message is required"],
    },
    servicePostPrice: {
      type: Number,
      required: [true, "Service post price is required"],
    },
    servicePostImage: {
      type: String,
      required: [true, "Service post image is required"],
    },
    servicePostRatings: [
      {
        consumerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Consumer",
          required: [true, "Consumer id is required"],
        },
        rating: {
          type: Number,
          min: 1,
          max: 5,
          required: [true, "Rating is required"],
        },
      },
    ],
  },
  { timestamps: true }
);

const servicePostModel = mongoose.model("ServicePost", servicePostSchema);

module.exports = servicePostModel;
