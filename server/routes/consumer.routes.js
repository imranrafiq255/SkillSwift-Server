const express = require("express");
const {
  signUp,
  avatarAndPhoneNumber,
  verifyEmail,
  addAddress,
  signIn,
  logout,
  loadCurrentConsumer,
  resetPassword,
  sendResetPasswordLink,
  orderService,
  rejectOrder,
} = require("../controllers/consumer.controllers");
const isConsumerAuthenticated = require("../middlewares/isConsumerAuthenticated.middlewares");
const singleImageUpload = require("../middlewares/singleImageUpload.middlewares");

const Router = express.Router();
Router.route("/sign-up").post(signUp);
Router.route("/avatar-phone-upload").post(
  isConsumerAuthenticated,
  singleImageUpload("consumerAvatar"),
  avatarAndPhoneNumber
);
Router.route("/confirm-email/:token").post(verifyEmail);
Router.route("/add-address").post(isConsumerAuthenticated, addAddress);
Router.route("/sign-in").post(signIn);
Router.route("/sign-out").get(isConsumerAuthenticated, logout);
Router.route("/load-current-consumer").get(
  isConsumerAuthenticated,
  loadCurrentConsumer
);
Router.route("/send-reset-password-email").post(sendResetPasswordLink);
Router.route("/reset-password/:token").put(resetPassword);
Router.route("/order-service").post(isConsumerAuthenticated, orderService);
Router.route("/reject-order/:id").delete(isConsumerAuthenticated, rejectOrder);
module.exports = Router;
