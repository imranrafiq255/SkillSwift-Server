const mongoose = require("mongoose");

const conversationSchema = mongoose.Schema(
  {
    members: {
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Consumer" || "ServiceProvider",
      },
      receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Consumer" || "ServiceProvider",
      },
    },
  },
  { timestams: true }
);

const conversationModel = mongoose.model("Conversation", conversationSchema);

module.exports = conversationModel;
