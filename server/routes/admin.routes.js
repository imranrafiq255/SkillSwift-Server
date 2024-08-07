const express = require("express");
const {
  signUp,
  signIn,
  sendResetPasswordLink,
  resetPassword,
  loadCurrentAdmin,
  signOut,
  addService,
  deleteService,
  loadAllServices,
  updateService,
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
Router.route("/add-service").post(isAdminAuthenticated, addService);
Router.route("/delete-service/:id").delete(isAdminAuthenticated, deleteService);
Router.route("/load-all-services").get(isAdminAuthenticated, loadAllServices);
Router.route("/update-service/:id").put(isAdminAuthenticated, updateService);
module.exports = Router;
