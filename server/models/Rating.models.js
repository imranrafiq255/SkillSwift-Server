const mongoose = require("mongoose");

const ratingSchema = mongoose.Schema(
  {
    servicePost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServicePost",
      required: [true, "Service post id is required"],
    },
    ratingStars: {
      type: Number,
      min: 1,
      max: 5,
      required: [true, "Rating stars are required"],
    },
    ratedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consumer",
      required: [true, "Rated by user id is required"],
    },
  },
  { timestamps: true }
);

const ratingModel = mongoose.model("Rating", ratingSchema);

module.exports = ratingModel;
