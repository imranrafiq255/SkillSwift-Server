const mongoose = require("mongoose");

const notificationSchema = mongoose.Schema(
  {
    notificationMessage: {
      type: String,
      required: [true, "Notification message is required"],
    },
    notificationSendBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consumer" || "ServiceProvider" || "Admin",
      required: [true, "Notification send by is required"],
    },
    notificationReceivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consumer" || "ServiceProvider" || "Admin",
      required: [true, "Notification received by is required"],
    },
    notificationType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dispute" || "Refund" || "ServiceOrder" || "Message",
      required: [true, "Notification type is required"],
    },
  },
  { timestamps: true }
);

const notificationModel = mongoose.model("Notification", notificationSchema);

module.exports = notificationModel;
