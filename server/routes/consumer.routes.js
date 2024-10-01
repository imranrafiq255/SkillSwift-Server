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
  loadNewNotifications,
  readNotification,
  fileDispute,
  loadDisputes,
  deleteDispute,
  addRating,
  submitRefundRequest,
  loadRecentServicePosts,
  loadPopularServicePosts,
  loadOrders,
  refundAmountRequest,
  loadAllRefunds,
  changeConsumerAddress,
  createConversation,
  loadConversations,
  sendMessage,
  loadMessages,
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
Router.route("/load-new-notifications").get(
  isConsumerAuthenticated,
  loadNewNotifications
);
Router.route("/read-notification/:id").get(
  isConsumerAuthenticated,
  readNotification
);
Router.route("/file-dispute/:id").post(isConsumerAuthenticated, fileDispute);
Router.route("/load-disputes").get(isConsumerAuthenticated, loadDisputes);
Router.route("/delete-dispute/:id").delete(
  isConsumerAuthenticated,
  deleteDispute
);
Router.route("/add-rating/:id").post(isConsumerAuthenticated, addRating);
Router.route("/submit-refund-request/:id").post(
  isConsumerAuthenticated,
  submitRefundRequest
);
Router.route("/load-recent-service-posts").get(loadRecentServicePosts);
Router.route("/load-popular-service-posts").get(loadPopularServicePosts);
Router.route("/load-orders").get(isConsumerAuthenticated, loadOrders);
Router.route("/refund-amount-request").post(
  isConsumerAuthenticated,
  refundAmountRequest
);
Router.route("/load-refunds").get(isConsumerAuthenticated, loadAllRefunds);
Router.route("/change-consumer-address").post(
  isConsumerAuthenticated,
  changeConsumerAddress
);
Router.route("/create-conversation").post(
  isConsumerAuthenticated,
  createConversation
);
Router.route("/load-consumer-conversations").get(
  isConsumerAuthenticated,
  loadConversations
);
Router.route("/send-message").post(isConsumerAuthenticated, sendMessage);
Router.route("/load-messages/:conversationId").get(
  isConsumerAuthenticated,
  loadMessages
);
module.exports = Router;
