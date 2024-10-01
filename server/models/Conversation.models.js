const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    members: {
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "memberTypeSender",
      },
      receiver: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "memberTypeReceiver",
      },
    },
    memberTypeSender: {
      type: String,
      enum: ["Consumer", "ServiceProvider"],
    },
    memberTypeReceiver: {
      type: String,
      enum: ["Consumer", "ServiceProvider"],
    },
  },
  { timestamps: true }
);

const conversationModel = mongoose.model("Conversation", conversationSchema);

module.exports = conversationModel;
