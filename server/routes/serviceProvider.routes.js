const express = require("express");
const {
  signUp,
  verifyEmail,
  avatarAndPhoneNumber,
  addAddress,
  signIn,
  signOut,
  sendResetPasswordLink,
  resetPassword,
  loadCurrentServiceProvider,
} = require("../controllers/serviceProvider.controllers");
const isServiceProviderAuthenticated = require("../middlewares/isServiceProviderAuthenticated.middlewares");
const singleImageUpload = require("../middlewares/singleImageUpload.middlewares");

const Router = express.Router();

Router.route("/sign-up").post(signUp);
Router.route("/verify-email/:token").post(verifyEmail);
Router.route("/avatar-phone-upload").post(
  isServiceProviderAuthenticated,
  singleImageUpload("serviceProviderAvatar"),
  avatarAndPhoneNumber
);
Router.route("/add-address").post(isServiceProviderAuthenticated, addAddress);
Router.route("/sign-in").post(signIn);
Router.route("/sign-out").get(isServiceProviderAuthenticated, signOut);
Router.route("/send-reset-password-email").post(sendResetPasswordLink);
Router.route("/reset-password/:token").post(resetPassword);
Router.route("/load-current-service-provider").get(
  isServiceProviderAuthenticated,
  loadCurrentServiceProvider
);
module.exports = Router;
