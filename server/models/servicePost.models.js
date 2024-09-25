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
        rating: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Rating",
        },
      },
    ],
  },
  { timestamps: true }
);

const servicePostModel = mongoose.model("ServicePost", servicePostSchema);

module.exports = servicePostModel;
