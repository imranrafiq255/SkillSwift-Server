const { STATUS_CODES } = require("http");
const cloudinary = require("cloudinary");
const fileUri = require("../config/fileUri.config");
const adminModel = require("../models/admin.models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { sendPasswordResetEmail } = require("../config/email.config");
exports.signUp = async (req, res) => {
  try {
    const { adminFullName, adminEmail, adminPassword, adminPhoneNumber } =
      req.body;
    if (!req.file) {
      return res.status(404).json({
        statusCode: STATUS_CODES[400],
        message: "Admin avatar is missing",
      });
    }
    const upload = await cloudinary.v2.uploader.upload(fileUri(req.file));
    await new adminModel({
      adminFullName,
      adminEmail,
      adminPassword,
      adminPhoneNumber,
      adminAvatar: upload.secure_url,
    }).save();
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      message: "Admin is created successfully",
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};
exports.signIn = async (req, res) => {
  try {
    const { adminEmail, adminPassword } = req.body;
    if (!adminEmail || !adminPassword) {
      return res.status(400).json({
        statusCode: STATUS_CODES[400],
        message: "Email and password are required",
      });
    }
    const admin = await adminModel
      .findOne({
        adminEmail: adminEmail.toLowerCase(),
      })
      .select("+adminPassword");
    if (!admin) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message: "Admin not found in database with email '" + adminEmail + "'",
      });
    }
    const isPasswordMatch = await bcrypt.compare(
      adminPassword,
      admin.adminPassword
    );
    if (!isPasswordMatch) {
      return res.status(400).json({
        statusCode: STATUS_CODES[400],
        message: "Invalid password",
      });
    }
    const token = await jwt.sign(
      { _id: admin._id, adminTokenVersion: admin.adminTokenVersion },
      process.env.ADMIN_SECRET_TOKEN
    );
    const options = {
      httpOnly: true,
      secure: true,
      maxAge: 1000 * 24 * 60 * 60 * 10,
    };
    res.cookie("adminToken", token, options);
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      message: "Admin sign in successful",
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};
exports.loadCurrentAdmin = async (req, res) => {
  try {
    res.status(200).json({
      statusCode: STATUS_CODES[200],
      admin: req.admin,
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};
exports.sendResetPasswordLink = async (req, res) => {
  try {
    const { adminEmail } = req.body;
    const admin = await adminModel.findOne({
      adminEmail: adminEmail.toLowerCase(),
    });
    if (!admin) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message: "Admin not found in database with email '" + adminEmail + "'",
      });
    }
    const token = jwt.sign(
      { _id: admin._id },
      process.env.FORGOT_PASSWORD_SECRET_TOKEN,
      { expiresIn: "1h" }
    );

    const clientUrl =
      process.env.CLIENT_URL + "/admin-reset-password" + `/${token}`;
    sendPasswordResetEmail(admin.adminEmail, clientUrl);
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      message: "Reset password link has been sent to your registered email",
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};
exports.resetPassword = async (req, res) => {
  try {
    const token = req.params.token;
    if (!token) {
      return res.status(400).json({
        statusCode: STATUS_CODES[400],
        message: "Token is missing",
      });
    }
    const decodedToken = jwt.verify(
      token,
      process.env.FORGOT_PASSWORD_SECRET_TOKEN
    );
    if (!decodedToken) {
      return res.status(400).json({
        statusCode: STATUS_CODES[400],
        message: "Token is invalid",
      });
    }
    const { newPassword } = req.body;
    const admin = await adminModel.findByIdAndUpdate(
      { _id: decodedToken._id },
      {
        adminPassword: await bcrypt.hash(newPassword, 10),
      },
      { new: true }
    );
    admin.adminTokenVersion = admin.adminTokenVersion + 1;
    await admin.save();
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      message: "Password changed successful",
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};
exports.signOut = async (req, res) => {
  try {
    res.clearCookie("adminToken");
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      message: "Admin signed out successfully",
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};
