const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: [true, "Message must belong to a conversation"],
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "senderType",
      required: [true, "Message must have a sender"],
    },
    senderType: {
      type: String,
      enum: ["Consumer", "ServiceProvider"],
      required: [true, "Sender type is required"],
    },
    message: {
      type: String,
      required: [true, "Message must contain text"],
    },
  },
  { timestamps: true }
);

const messageModel = mongoose.model("Message", messageSchema);

module.exports = messageModel;
