const mongoose = require("mongoose");

const messageSchema = mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: [true, "Message must belong to a conversation"],
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consumer" || "ServiceProvider",
      required: [true, "Message must have a sender"],
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
