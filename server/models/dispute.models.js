const mongoose = require("mongoose");

const disputeSchema = mongoose.Schema(
  {
    disputeTitle: {
      type: String,
      required: [true, "dispute title is required"],
      minlength: 3,
      maxlength: 50,
    },
    disputeDetails: {
      type: String,
      required: [true, "dispute details are required"],
      minlength: 5,
      maxlength: 500,
    },
    disputeFiledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consumer",
      required: [true, "dispute filed by is required"],
    },
    disputeFiledAgainst: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceProvider",
      required: [true, "dispute filed against is required"],
    },
    disputeStatus: {
      type: String,
      enum: ["pending", "resolved", "rejected"],
      default: "pending",
    },
    disputeResolution: {
      type: String,
    },
  },
  { timestamp: true }
);

const disputeModel = mongoose.model("Dispute", disputeSchema);

module.exports = disputeModel;
