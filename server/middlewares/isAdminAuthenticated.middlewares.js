const { STATUS_CODES } = require("http");
const jwt = require("jsonwebtoken");
const adminModel = require("../models/admin.models");
const isAdminAuthenticated = async (req, res, next) => {
  try {
    const { adminToken } = req.cookies;
    if (!adminToken) {
      return res.status(401).json({
        statusCode: STATUS_CODES[401],
        message: "Admin not authenticated",
      });
    }
    const decodedToken = await jwt.verify(
      adminToken,
      process.env.ADMIN_SECRET_TOKEN
    );
    if (!decodedToken) {
      return res.status(401).json({
        statusCode: STATUS_CODES[401],
        message: "Token is invalid",
      });
    }
    const admin = await adminModel.findOne({ _id: decodedToken._id });
    if (!admin) {
      res.clearCookie("adminToken");
      return res.status(401).json({
        statusCode: STATUS_CODES[401],
        message:
          "Admin not found in database with id '" + decodedToken._id + "'",
      });
    }
    if (admin.adminTokenVersion !== decodedToken.adminTokenVersion) {
      return res.status(401).json({
        statusCode: STATUS_CODES[401],
        message:
          "Token version is invalid, that means your password is changed",
      });
    }
    req.admin = admin;
    next();
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};

module.exports = isAdminAuthenticated;
