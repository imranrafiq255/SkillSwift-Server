const { STATUS_CODES } = require("http");
const cloudinary = require("cloudinary");
const fileUri = require("../config/fileUri.config");
const adminModel = require("../models/admin.models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {
  sendPasswordResetEmail,
  sendDisputeEmail,
  sendRefundEmail,
  sendAccountVerificationEmail,
} = require("../config/email.config");
const serviceModel = require("../models/service.models");
const disputeModel = require("../models/dispute.models");
const notificationModel = require("../models/notification.models");
const refundModel = require("../models/refund.models");
const serviceProviderModel = require("../models/serviceProvider.models");
const serviceOrderModel = require("../models/serviceOrder.models");
const consumerModel = require("../models/consumer.models");
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
    res.clearCookie("adminToken");
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
exports.resolveDispute = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        statusCode: STATUS_CODES[400],
        message: "Dispute id is required",
      });
    }
    const disputeExisted = await disputeModel.findById(id);
    if (!disputeExisted) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message: "Dispute not found with id " + id,
      });
    }
    const { disputeResolution } = req.body;
    if (!disputeResolution) {
      return res.status(400).json({
        statusCode: STATUS_CODES[400],
        message: "Dispute resolution is required",
      });
    }
    const dispute = await disputeModel
      .findByIdAndUpdate(
        id,
        {
          disputeResolution: disputeResolution,
          disputeStatus: "resolved",
        },
        { new: true }
      )
      .populate("disputeFiledBy");
    if (!dispute) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message: "Dispute not found with id " + id,
      });
    }
    if (!dispute.disputeFiledBy.consumerEmail) {
      return res.status(400).json({
        statusCode: STATUS_CODES[400],
        message: "Consumer email is not available for this dispute.",
      });
    }
    await sendDisputeEmail(
      dispute.disputeFiledBy.consumerEmail,
      "Dispute Information",
      "Your dispute has been resolved.",
      "Dispute Resolved By",
      req.admin.adminFullName
    );

    // Send notification to the consumer
    await new notificationModel({
      notificationMessage: `${disputeResolution}`,
      notificationSendBy: req.admin._id,
      notificationReceivedBy: dispute.disputeFiledBy,
    }).save();

    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      message: "Dispute resolved successfully",
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};

exports.rejectDispute = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({
        statusCode: STATUS_CODES[400],
        message: "Dispute id is required",
      });
    }
    const { disputeResolution } = req.body;
    if (!disputeResolution) {
      return res.status(400).json({
        statusCode: STATUS_CODES[400],
        message: "Dispute resolution is required",
      });
    }
    const disputeExisted = await disputeModel
      .findById(id)
      .populate("disputeFiledBy")
      .populate("disputeFiledAgainst");
    if (!disputeExisted) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message: "Dispute not found with id " + id,
      });
    }
    await disputeModel.findByIdAndUpdate(id, {
      disputeStatus: "rejected",
      disputeResolution: disputeResolution,
    });
    sendDisputeEmail(
      disputeExisted.disputeFiledBy.consumerEmail,
      "Dispute Information",
      "Your dispute has been rejected.",
      "Dispute Rejected By",
      req.admin.adminFullName
    );
    await new notificationModel({
      notificationMessage: `Dispute #${disputeExisted._id} has been rejected by ${req.admin.adminFullName}`,
      notificationSendBy: req.admin._id,
      notificationReceivedBy: disputeExisted.disputeFiledBy,
    }).save();
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      message: "Dispute rejected successfully",
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};
exports.loadDisputes = async (req, res) => {
  try {
    let disputes = await disputeModel
      .find()
      .populate("disputeFiledAgainst")
      .populate("disputeFiledBy");
    disputes = disputes.filter((dipsute) => {
      return !dipsute.disputeResolution;
    });
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      disputes,
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};
exports.approveRefundRequest = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({
        statusCode: STATUS_CODES[400],
        message: "Refund request id is required",
      });
    }
    const refundRequestExisted = await refundModel
      .findById(id)
      .populate("refundRequestedBy");
    if (!refundRequestExisted) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message: "Refund request not found with id " + id,
      });
    }
    refundRequestExisted.refundAmountStatus = "approved";
    await refundRequestExisted.save();
    sendRefundEmail(
      refundRequestExisted.refundRequestedBy.consumerEmail,
      "Refund Information",
      "Your refund request has been approved. You will receive you refunded amount soon!",
      "Request Approved By",
      req.admin.adminFullName
    );
    await new notificationModel({
      notificationMessage: `Refund #${refundRequestExisted._id} has been approved by ${req.admin.adminFullName}`,
      notificationSendBy: req.admin._id,
      notificationReceivedBy: refundRequestExisted.refundRequestedBy,
    }).save();
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      message: "Refund request has been approved",
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};
exports.rejectRefundRequest = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message: "Id parameter is missing",
      });
    }
    const refundRequestExisted = await refundModel
      .findOne({ _id: id })
      .populate("refundRequestedBy");
    if (!refundRequestExisted) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message: "No refund request found with given id",
      });
    }
    refundRequestExisted.refundAmountStatus = "rejected";
    await refundRequestExisted.save();
    sendRefundEmail(
      refundRequestExisted.refundRequestedBy.consumerEmail,
      "Refund Information",
      "Your refund request has been rejected by admin.",
      "Request Rejected By",
      req.admin.adminFullName
    );
    await new notificationModel({
      notificationMessage: `Refund #${refundRequestExisted._id} has rejected by ${req.admin.adminFullName}`,
      notificationSendBy: req.admin._id,
      notificationReceivedBy: refundRequestExisted.refundRequestedBy,
    }).save();
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      message: "Refund request rejected successfully",
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};
exports.loadRefunds = async (req, res) => {
  try {
    let refunds = await refundModel
      .find()
      .populate("refundRequestedBy")
      .populate("refundRequestedAgainst")
      .populate("order")
      .populate({
        path: "order",
        populate: {
          path: "servicePost",
          model: "ServicePost",
        },
      });
    refunds = refunds.filter((refund) => {
      return refund.refundAmountStatus === "pending";
    });
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      refunds,
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};
exports.verifyServiceProviderAccount = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({
        statusCode: STATUS_CODES[400],
        message: "Service provider id is required",
      });
    }
    const serviceProviderExisted = await serviceProviderModel.findById(id);
    if (!serviceProviderExisted) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message: "Service provider not found with id " + id,
      });
    }
    serviceProviderExisted.isAccountVerified = true;
    await serviceProviderExisted.save();
    sendAccountVerificationEmail(
      serviceProviderExisted.serviceProviderEmail,
      serviceProviderExisted.serviceProviderFullName,
      "Account Verification Information",
      "Your account has been verified. You can now use the platform."
    );
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      message: "Service provider account has been verified",
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};
exports.loadAllOrders = async (req, res) => {
  try {
    let orders = await serviceOrderModel
      .find()
      .populate("servicePost")
      .populate("serviceOrderBy");
    orders = orders.sort((order) => {
      return order.orderStatus === "pending";
    });
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      orders,
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};
exports.loadAllServiceProviders = async (req, res) => {
  try {
    let serviceProviders = await serviceProviderModel.find();
    serviceProviders = serviceProviders.sort((a, b) => {
      return a.isAccountVerified - b.isAccountVerified;
    });

    res.status(200).json({
      statusCode: STATUS_CODES[200],
      serviceProviders,
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};
exports.loadAllConsumers = async (req, res) => {
  try {
    const consumers = await consumerModel.find();
    res.status(200).json({
      statusCode: STATUS_CODES[200],
      consumers,
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};
