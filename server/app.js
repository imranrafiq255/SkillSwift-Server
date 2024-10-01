require("dotenv").config();
const cookieParser = require("cookie-parser");
const express = require("express");
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
require("./config/dbConnection.config")(process.env.MONGO_URI);
require("./config/cloudinary.config")();

const Consumer = require("./routes/consumer.routes");
const serviceProvider = require("./routes/serviceProvider.routes");
const Admin = require("./routes/admin.routes");
app.use("/api/v1/consumer", Consumer);
app.use("/api/v1/service-provider", serviceProvider);
app.use("/api/v1/admin", Admin);

// chat work for service provider and consumer
const io = require("socket.io")(8081, {
  cors: {
    origin: "http://localhost:3000",
  },
});

let users = [];

io.on("connection", (socket) => {
  socket.on("addUser", ({ id }) => {
    try {
      let user = users.find((s) => s.id === id);
      if (!user) {
        users.push({ id, socketId: socket.id });
        io.emit("getUsers", users);
      }
    } catch (error) {
      console.error("Error adding user:", error);
    }
  });

  socket.on("sendMessage", ({ message, senderId, receiverId }) => {
    try {
      const sender = users.find((user) => user.id === senderId);
      const receiver = users.find((user) => user.id === receiverId);

      if (receiver) {
        io.to(receiver.socketId).emit("receivedMessage", {
          message: message,
        });
        console.log("Message sent from:", senderId, "to:", receiverId);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  });

  socket.on("disconnect", () => {
    try {
      users = users.filter((s) => s.socketId !== socket.id);
      io.emit("getUsers", users);
    } catch (error) {
      console.error("Error handling disconnect:", error);
    }
  });
});

module.exports = app;
