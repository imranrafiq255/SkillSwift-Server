const express = require("express");
const {
  signUp,
  signIn,
  sendResetPasswordLink,
  resetPassword,
  loadCurrentAdmin,
  signOut,
  resolveDispute,
  rejectDispute,
  approveRefundRequest,
  rejectRefundRequest,
  loadDisputes,
  loadRefunds,
  verifyServiceProviderAccount,
  loadAllOrders,
  loadAllServiceProviders,
  loadAllConsumers,
} = require("../controllers/admin.controllers");
const singleImageUpload = require("../middlewares/singleImageUpload.middlewares");
const isAdminAuthenticated = require("../middlewares/isAdminAuthenticated.middlewares");
const Router = express.Router();

Router.route("/sign-up").post(singleImageUpload("adminAvatar"), signUp);
Router.route("/sign-in").post(signIn);
Router.route("/send-reset-password-email").post(sendResetPasswordLink);
Router.route("/reset-password/:token").post(resetPassword);
Router.route("/load-current-admin").get(isAdminAuthenticated, loadCurrentAdmin);
Router.route("/sign-out").get(isAdminAuthenticated, signOut);
// Services
Router.route("/resolve-dispute/:id").post(isAdminAuthenticated, resolveDispute);
Router.route("/reject-dispute/:id").post(isAdminAuthenticated, rejectDispute);
Router.route("/approve-refund-request/:id").get(
  isAdminAuthenticated,
  approveRefundRequest
);
Router.route("/reject-refund-request/:id").get(
  isAdminAuthenticated,
  rejectRefundRequest
);
Router.route("/load-disputes").get(isAdminAuthenticated, loadDisputes);
Router.route("/load-refunds").get(isAdminAuthenticated, loadRefunds);
Router.route("/verify-service-provider-account/:id").get(
  isAdminAuthenticated,
  verifyServiceProviderAccount
);
Router.route("/load-all-orders").get(isAdminAuthenticated, loadAllOrders);
Router.route("/load-service-providers").get(
  isAdminAuthenticated,
  loadAllServiceProviders
);
Router.route("/load-all-consumers").get(isAdminAuthenticated, loadAllConsumers);
module.exports = Router;
