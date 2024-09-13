const mongoose = require("mongoose");

const serviceOrderSchema = mongoose.Schema(
  {
    servicePost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServicePost",
      required: [true, "Service post id is required"],
    },
    serviceProvider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceProvider",
      required: [true, "Service provider id is required"],
    },
    serviceOrderBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consumer",
      required: [true, "Service ordered by's id is required"],
    },
    orderDeliverySchedule: {
      type: String,
      required: [true, "Order delivery schedule is required"],
    },
    orderStatus: {
      type: String,
      enum: ["pending", "accepted", "rejected", "completed", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const serviceOrderModel = mongoose.model("ServiceOrder", serviceOrderSchema);

module.exports = serviceOrderModel;
