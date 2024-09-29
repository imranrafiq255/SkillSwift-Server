const mongoose = require("mongoose");

const refundSchema = mongoose.Schema(
  {
    refundRequestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consumer",
      required: [true, "refund requested by's id is required"],
    },
    refundRequestedAgainst: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceProvider",
      required: [true, "refund requested against's id is required"],
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceOrder",
      required: [true, "refund requested against's order is required"],
    },
    refundAmountPercentage: {
      type: Number,
      required: [true, "refund amount is required"],
    },
    refundDetails: {
      type: String,
      required: [true, "Refund details is required"],
    },
    refundAmountStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const refundModel = mongoose.model("Refund", refundSchema);
module.exports = refundModel;
