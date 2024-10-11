const { STATUS_CODES } = require("http");
const serviceProviderModel = require("../models/serviceProvider.models");
const jwt = require("jsonwebtoken");
const {
  sendConfirmEmail,
  sendPasswordResetEmail,
  sendOrderEmail,
} = require("../config/email.config");
const fileUri = require("../config/fileUri.config");
const cloudinary = require("cloudinary");
const bcrypt = require("bcrypt");
const servicePostModel = require("../models/servicePost.models");
const serviceOrderModel = require("../models/serviceOrder.models");
const notificationModel = require("../models/notification.models");
const conversationModel = require("../models/Conversation.models");
const messageModel = require("../models/message.models");
const disputeModel = require("../models/dispute.models");
exports.signUp = async (req, res) => {
  try {
    const {
      serviceProviderFullName,
      serviceProviderEmail,
      serviceProviderPassword,
    } = req.body;
    const existingServiceProvider = await serviceProviderModel.findOne({
      serviceProviderEmail,
    });
    if (existingServiceProvider) {
      return res.status(409).json({
        statusCode: STATUS_CODES[409],
        message: "Email already exists",
      });
    }
    const newServiceProvider = await new serviceProviderModel({
      serviceProviderFullName,
      serviceProviderEmail,
      serviceProviderPassword,
    }).save();
    const token = await jwt.sign(
      {
        _id: newServiceProvider._id,
      },
      process.env.SERVICE_PROVIDER_EMAIL_SECRET_TOKEN,
      { expiresIn: "1h" }
    );
    const clientUrl =
      process.env.CLIENT_URL + "/service-provider-confirm-email" + `/${token}`;
    sendConfirmEmail(newServiceProvider.serviceProviderEmail, clientUrl);
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      message:
        "You have received a confirmation email, please confirm your email",
    });
  } catch (error) {
    res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};
exports.verifyEmail = async (req, res) => {
  try {
    const myToken = req.params.token;
    if (!myToken) {
      return res.status(400).json({
        statusCode: STATUS_CODES[400],
        message: "Token is missing",
      });
    }
    const decodedToken = jwt.verify(
      myToken,
      process.env.SERVICE_PROVIDER_EMAIL_SECRET_TOKEN,
      { expiresIn: "1h" }
    );
    if (!decodedToken) {
      return res.status(400).json({
        statusCode: STATUS_CODES[400],
        message: "Token is invalid",
      });
    }
    const serviceProvider = await serviceProviderModel.findByIdAndUpdate(
      { _id: decodedToken._id },
      { isEmailVerified: true },
      { new: true }
    );
    if (!serviceProvider) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message:
          "Service provider not found in database with id '" +
          decodedToken._id +
          "'",
      });
    }
    const token = await jwt?.sign(
      {
        _id: serviceProvider._id,
        serviceProviderTokenVersion:
          serviceProvider.serviceProviderTokenVersion,
      },
      process.env.SERVICE_PROVIDER_SECRET_TOKEN
    );
    const options = {
      httpOnly: true,
      // secure: true, // this is causing issues for remote access
      maxAge: 1000 * 24 * 60 * 60 * 20,
    };
    res.cookie("serviceProviderToken", token, options);
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      message: "Email verification successful",
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};
exports.avatarAndPhoneNumber = async (req, res) => {
  try {
    const serviceProvider = await serviceProviderModel.findById({
      _id: req.serviceProvider._id,
    });
    if (!serviceProvider) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message: "Service provider not found in database with id '" + id + "'",
      });
    }
    const { serviceProviderPhoneNumber, serviceProviderAddress } = req.body;
    if (!req.file) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message: "Image is missing!",
      });
    }
    const upload = await cloudinary.v2.uploader.upload(fileUri(req.file));
    serviceProvider.serviceProviderPhoneNumber = serviceProviderPhoneNumber;
    serviceProvider.serviceProviderAvatar = upload.secure_url;
    serviceProvider.serviceProviderAddress = serviceProviderAddress;
    await serviceProvider.save();
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      message:
        "Service provider details(phone number and profile avatar) is updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};
exports.addAddress = async (req, res) => {
  try {
    const { serviceProviderAddress } = req.body;
    const serviceProvider = await serviceProviderModel.findById({
      _id: req.serviceProvider._id,
    });
    serviceProvider.serviceProviderAddress = serviceProviderAddress;
    await serviceProvider.save();
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      message: "Service provider address added successfully",
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
    const { serviceProviderEmail, serviceProviderPassword } = req.body;

    if (!serviceProviderEmail || !serviceProviderPassword) {
      return res.status(400).json({
        statusCode: STATUS_CODES[400],
        message: "Email and password are required",
      });
    }
    const serviceProvider = await serviceProviderModel
      .findOne({ serviceProviderEmail: serviceProviderEmail.toLowerCase() })
      .select("+serviceProviderPassword");
    if (!serviceProvider) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message:
          "Service provider not found in database with email '" +
          serviceProviderEmail +
          "'",
      });
    }
    if (!serviceProvider.isEmailVerified) {
      return res.status(400).json({
        statusCode: STATUS_CODES[400],
        message: "Please verify your email before signing in",
      });
    }
    const isPasswordMatch = await bcrypt.compare(
      serviceProviderPassword,
      serviceProvider.serviceProviderPassword
    );
    if (!isPasswordMatch) {
      return res.status(400).json({
        statusCode: STATUS_CODES[400],
        message: "Incorrect password",
      });
    }
    const token = await jwt?.sign(
      {
        _id: serviceProvider._id,
        serviceProviderTokenVersion:
          serviceProvider.serviceProviderTokenVersion,
      },
      process.env.SERVICE_PROVIDER_SECRET_TOKEN
    );
    const options = {
      httpOnly: true,
      // secure: true, // this is causing issues for remote access
      maxAge: 1000 * 24 * 60 * 60 * 20,
    };
    res.cookie("serviceProviderToken", token, options);
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      message: "Service provider signed in successfully",
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
    res.clearCookie("serviceProviderToken");
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      message: "Service provider signed out successfully",
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};
exports.loadCurrentServiceProvider = async (req, res) => {
  try {
    const serviceProvider = await serviceProviderModel.findOne({
      _id: req.serviceProvider._id,
    });

    res.status(200).json({
      statusCode: STATUS_CODES[200],
      serviceProvider: serviceProvider,
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
    const { serviceProviderEmail } = req.body;
    const serviceProvider = await serviceProviderModel.findOne({
      serviceProviderEmail: serviceProviderEmail.toLowerCase(),
    });
    if (!serviceProvider) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message:
          "Service provider not found in database with email '" +
          serviceProviderEmail +
          "'",
      });
    }
    const token = jwt.sign(
      { _id: serviceProvider._id },
      process.env.FORGOT_PASSWORD_SECRET_TOKEN,
      { expiresIn: "1h" }
    );

    const clientUrl =
      process.env.CLIENT_URL + "/service-provider-reset-password" + `/${token}`;
    sendPasswordResetEmail(serviceProvider.serviceProviderEmail, clientUrl);
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

    let decodedToken;
    try {
      decodedToken = jwt.verify(
        token,
        process.env.FORGOT_PASSWORD_SECRET_TOKEN
      );
    } catch (err) {
      return res.status(400).json({
        statusCode: STATUS_CODES[400],
        message: "Token is invalid or expired",
      });
    }

    let { serviceProviderPassword } = req.body;
    if (!serviceProviderPassword) {
      return res.status(400).json({
        statusCode: STATUS_CODES[400],
        message: "Password is required",
      });
    }

    const serviceProvider = await serviceProviderModel
      .findOne({
        _id: decodedToken._id,
      })
      .select("+serviceProviderPassword");

    if (!serviceProvider) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message: "Service provider not found",
      });
    }
    serviceProvider.serviceProviderTokenVersion += 1;
    serviceProvider.serviceProviderPassword = serviceProviderPassword;
    await serviceProvider.save();

    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      message: "Password changed successfully",
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};

exports.setWorkingHours = async (req, res) => {
  try {
    const { serviceProviderWorkingHours } = req.body;
    const serviceProvider = await serviceProviderModel.findOne({
      _id: req.serviceProvider._id,
    });
    const isTimeExisted = serviceProvider?.serviceProviderWorkingHours?.find(
      (time) =>
        time.dayOfWeek === serviceProviderWorkingHours.dayOfWeek &&
        time.time === serviceProviderWorkingHours.time
    );
    if (isTimeExisted) {
      return res.status(400).json({
        statusCode: STATUS_CODES[400],
        message: "Working hours for this day already exists",
      });
    }
    serviceProvider.serviceProviderWorkingHours.push(
      serviceProviderWorkingHours
    );
    await serviceProvider.save();
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      message: "Service provider working hours updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};
exports.deleteWorkingHours = async (req, res) => {
  try {
    const { dayOfWeek, time } = req.query;

    const serviceProvider = await serviceProviderModel.findOne({
      _id: req.serviceProvider._id,
    });

    const index = serviceProvider.serviceProviderWorkingHours.findIndex(
      (time1) => time1.dayOfWeek === dayOfWeek && time1.time === time
    );

    if (index === -1) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message: "Working hours not found",
      });
    }

    serviceProvider.serviceProviderWorkingHours.splice(index, 1);
    await serviceProvider.save();

    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      message: "Service provider working hours deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};

exports.addCNICDetails = async (req, res) => {
  try {
    const serviceProvider = await serviceProviderModel.findById({
      _id: req.serviceProvider._id,
    });
    if (!req.files || req.files.length !== 2) {
      return res.status(400).json({
        statusCode: 400,
        message: "Exactly two images are required!",
      });
    }
    let serviceProviderImages = [];
    await Promise.all(
      req.files.map(async (file) => {
        let result = await cloudinary.v2.uploader.upload(fileUri(file));
        serviceProviderImages.push(result.secure_url);
      })
    );
    serviceProvider.serviceProviderCNICImages = serviceProviderImages;
    await serviceProvider.save();
    return res.status(200).json({
      statusCode: 200,
      message: "Service provider CNIC images are updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};

exports.addServicePost = async (req, res) => {
  try {
    const { serviceName, servicePostMessage, servicePostPrice } = req.body;
    if (!req.file) {
      return res.status(400).json({
        statusCode: 400,
        message: "Service post image is required!",
      });
    }
    const upload = await cloudinary.v2.uploader.upload(fileUri(req.file));
    await new servicePostModel({
      serviceName,
      servicePostMessage,
      servicePostPrice,
      serviceProvider: req.serviceProvider._id,
      servicePostImage: upload.secure_url,
    }).save();
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      message: "Service post created successfully",
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};
exports.deleteServicePost = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message: "Id parameter is missing",
      });
    }
    const deletedServicePost = await servicePostModel.findByIdAndDelete({
      _id: id,
      serviceProvider: req.serviceProvider._id,
    });
    if (!deletedServicePost) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message: "No post found with given id" + id,
      });
    }
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      message: "Service post deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};
exports.loadAllServiceProviderPosts = async (req, res) => {
  try {
    let posts = await servicePostModel.find({
      serviceProvider: req.serviceProvider._id,
    });

    posts = posts.sort((post1, post2) => {
      return new Date(post2.createdAt) - new Date(post1.createdAt);
    });

    res.status(200).json({
      statusCode: STATUS_CODES[200],
      posts,
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: 500,
      message: error.message,
    });
  }
};

exports.deleteServicePost = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message: "Id parameter is missing",
      });
    }
    const deletedServicePost = await servicePostModel.findOneAndDelete({
      _id: id,
      serviceProvider: req.serviceProvider._id,
    });

    if (!deletedServicePost) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message: "No post found with given id: " + id,
      });
    }
    const orders = await serviceOrderModel.find({
      serviceProvider: req.serviceProvider._id,
      servicePost: id,
    });
    await Promise.all(orders.map(async (order) => await order.deleteOne()));

    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      message: "Service post and associated orders deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};

exports.acceptOrder = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message: "Id parameter is missing",
      });
    }

    const order = await serviceOrderModel
      .findOne({ _id: id, serviceProvider: req.serviceProvider._id })
      .populate("serviceOrderBy")
      .populate("servicePost");
    if (
      !order ||
      !order.serviceOrderBy ||
      !order.serviceOrderBy.consumerEmail
    ) {
      return res.status(400).json({
        statusCode: STATUS_CODES[400],
        message: "Recipient email is missing or undefined",
      });
    }
    sendOrderEmail(
      order.serviceOrderBy.consumerEmail,
      "Order Information",
      {
        orderToName: order?.serviceOrderBy.consumerFullName,
        orderByName: req.serviceProvider.serviceProviderFullName,
        servicePostMessage: order.servicePost.servicePostMessage,
        _id: order._id,
      },
      "This order has been accepted",
      "Accepted By"
    );

    await new notificationModel({
      notificationMessage: `Order #${order._id} has been accepted by ${req.serviceProvider.serviceProviderFullName}`,
      notificationSendBy: req.serviceProvider._id,
      notificationReceivedBy: order.serviceOrderBy,
    }).save();
    order.orderStatus = "accepted";
    await order.save();
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      message: "You accepted the order successfully",
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};

exports.rejectOrder = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message: "Id parameter is missing",
      });
    }
    const order = await serviceOrderModel
      .findOne({
        _id: id,
        serviceProvider: req.serviceProvider._id,
      })
      .populate("serviceOrderBy")
      .populate("servicePost");
    if (!order) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message: "No order found with given id" + id,
      });
    }
    if (order.orderStatus !== "pending") {
      return res.status(400).json({
        statusCode: STATUS_CODES[400],
        message: "Cannot reject an order that is not pending",
      });
    }
    order.orderStatus = "rejected";
    await order.save();
    await new notificationModel({
      notificationMessage: `Order #${order._id} has been rejected by ${req.serviceProvider.serviceProviderFullName}`,
      notificationSendBy: req.serviceProvider._id,
      notificationReceivedBy: order.serviceOrderBy,
    }).save();
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      message: "You rejected the order successfully",
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};
exports.cancelOrder = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message: "Id parameter is missing",
      });
    }
    const order = await serviceOrderModel
      .findOne({
        _id: id,
        serviceProvider: req.serviceProvider._id,
      })
      .populate("serviceOrderBy")
      .populate("servicePost");
    if (!order) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message: "No order found with given id" + id,
      });
    }
    if (order.orderStatus !== "accepted") {
      return res.status(400).json({
        statusCode: STATUS_CODES[400],
        message: "Cannot cancel an order that is not accepted",
      });
    }
    order.orderStatus = "cancelled";
    await order.save();
    sendOrderEmail(
      order.serviceOrderBy.consumerEmail,
      "Order Information",
      {
        orderToName: order?.serviceOrderBy.consumerFullName,
        orderByName: req.serviceProvider.serviceProviderFullName,
        servicePostMessage: order.servicePost.servicePostMessage,
        _id: order._id,
      },
      "This order has been cancelled with details below:",
      "Order Cancelled By"
    );
    await new notificationModel({
      notificationMessage: `Order #${order._id} has been cancelled by ${req.serviceProvider.serviceProviderFullName}`,
      notificationSendBy: req.serviceProvider._id,
      notificationReceivedBy: order.serviceOrderBy,
    }).save();
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      message: "You cancelled the order successfully",
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};
exports.completeOrder = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message: "Id parameter is missing",
      });
    }
    const order = await serviceOrderModel
      .findOne({
        _id: id,
        serviceProvider: req.serviceProvider._id,
      })
      .populate("serviceOrderBy")
      .populate("servicePost");
    if (
      !order ||
      !order.serviceOrderBy ||
      !order.serviceOrderBy.consumerEmail
    ) {
      return res.status(400).json({
        statusCode: STATUS_CODES[400],
        message: "Recipient email is missing or undefined",
      });
    }
    if (!order) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message: "No order found with given id" + id,
      });
    }
    if (order.orderStatus !== "accepted") {
      return res.status(400).json({
        statusCode: STATUS_CODES[400],
        message: "Cannot cancel an order that is not accepted",
      });
    }
    await new notificationModel({
      notificationMessage: `Order #${order._id} has been completed by ${req.serviceProvider.serviceProviderFullName}`,
      notificationSendBy: req.serviceProvider._id,
      notificationReceivedBy: order.serviceOrderBy,
    }).save();
    order.orderStatus = "completed";
    await order.save();
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      message: "You completed the order successfully",
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};
exports.loadOrders = async (req, res) => {
  try {
    const orders = await serviceOrderModel
      .find({
        serviceProvider: req.serviceProvider._id,
      })
      .populate({
        path: "servicePost",
      })
      .populate("serviceOrderBy");
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
exports.loadPendingOrders = async (req, res) => {
  try {
    const pendingOrders = await serviceOrderModel
      .find({
        serviceProvider: req.serviceProvider._id,
        orderStatus: "pending",
      })
      .populate({
        path: "servicePost",
      })
      .populate("serviceOrderBy");
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      pendingOrders,
    });
  } catch (error) {
    res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};
exports.loadCompletedOrders = async (req, res) => {
  try {
    const completedOrders = await serviceOrderModel
      .find({
        serviceProvider: req.serviceProvider._id,
        orderStatus: "completed",
      })
      .populate({
        path: "servicePost",
      })
      .populate("serviceOrderBy");
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      completedOrders,
    });
  } catch (error) {
    res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};
exports.loadAcceptedOrders = async (req, res) => {
  try {
    const acceptedOrders = await serviceOrderModel
      .find({
        serviceProvider: req.serviceProvider._id,
        orderStatus: "accepted",
      })
      .populate({
        path: "servicePost",
      })
      .populate("serviceOrderBy");
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      acceptedOrders,
    });
  } catch (error) {
    res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};
exports.loadRejectedOrders = async (req, res) => {
  try {
    const rejectedOrders = await serviceOrderModel
      .find({
        serviceProvider: req.serviceProvider._id,
        orderStatus: "rejected",
      })
      .populate({
        path: "servicePost",
      })
      .populate("serviceOrderBy");
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      rejectedOrders,
    });
  } catch (error) {
    res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};
exports.loadCancelledOrders = async (req, res) => {
  try {
    const cancelledOrders = await serviceOrderModel
      .find({
        serviceProvider: req.serviceProvider._id,
        orderStatus: "cancelled",
      })
      .populate({
        path: "servicePost",
      })
      .populate("serviceOrderBy");
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      cancelledOrders,
    });
  } catch (error) {
    res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};
exports.loadAllNewNotifications = async (req, res) => {
  try {
    let notifications = await notificationModel
      .find({
        notificationReceivedBy: req.serviceProvider._id,
        notificationRead: false,
      })
      .populate("notificationReceivedBy")
      .populate("notificationSendBy");
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      notifications,
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};
exports.readNotification = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message: "Id parameter is missing",
      });
    }
    await notificationModel.findByIdAndUpdate(
      { _id: id, notificationReceivedBy: req.serviceProvider._id },
      { notificationRead: true },
      { new: true }
    );
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      message: "You have read the notification successfully",
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};
exports.loadServiceProviderDisputes = async (req, res) => {
  try {
    const disputes = await disputeModel
      .find({
        disputeFiledAgainst: req.serviceProvider._id,
      })
      .populate("disputeFiledBy")
      .populate("disputeFiledAgainst")
      .populate({
        path: "order",
        populate: {
          path: "servicePost",
          model: "ServicePost",
        },
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

exports.createConversation = async (req, res) => {
  try {
    const { receiver, receiverType } = req.body;

    const sender = req.serviceProvider._id;
    const senderType = "ServiceProvider";

    if (receiver.toString() === sender.toString()) {
      return res.status(400).json({
        statusCode: STATUS_CODES[400],
        message: "You cannot start a conversation with yourself",
      });
    }

    if (
      !receiver ||
      !receiverType ||
      !["Consumer", "ServiceProvider"].includes(receiverType)
    ) {
      return res.status(400).json({
        statusCode: STATUS_CODES[400],
        message: "Invalid receiver information",
      });
    }

    const existingConversation = await conversationModel.findOne({
      $or: [
        {
          "members.sender": sender,
          "members.receiver": receiver,
          memberTypeSender: senderType,
          memberTypeReceiver: receiverType,
        },
        {
          "members.sender": receiver,
          "members.receiver": sender,
          memberTypeSender: receiverType,
          memberTypeReceiver: senderType,
        },
      ],
    });

    if (existingConversation) {
      return res.status(409).json({
        statusCode: STATUS_CODES[409],
        message: "A conversation with this user already exists",
      });
    }

    const newConversation = new conversationModel({
      members: {
        sender,
        receiver,
      },
      memberTypeSender: senderType,
      memberTypeReceiver: receiverType,
    });

    await newConversation.save();
    return res.status(201).json({
      statusCode: STATUS_CODES[201],
      message: "Conversation created successfully",
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};

exports.loadConversations = async (req, res) => {
  try {
    const serviceProviderId = req.serviceProvider._id;
    const conversations = await conversationModel
      .find({
        $or: [
          { "members.sender": serviceProviderId },
          { "members.receiver": serviceProviderId },
        ],
      })
      .populate({
        path: "members.sender",
        refPath: "memberTypeSender",
        select:
          "_id consumerFullName consumerAvatar consumerEmail serviceProviderFullName serviceProviderEmail serviceProviderAvatar",
      })
      .populate({
        path: "members.receiver",
        refPath: "memberTypeReceiver",
        select:
          "_id consumerFullName consumerAvatar consumerEmail serviceProviderFullName serviceProviderEmail serviceProviderAvatar",
      })
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      conversations,
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};
exports.sendMessage = async (req, res) => {
  try {
    const { conversationId, message } = req.body;
    const sender = req.serviceProvider._id;
    const senderType = "ServiceProvider";

    const conversation = await conversationModel.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message: "Conversation not found",
      });
    }

    if (
      conversation.members.sender.toString() !== sender.toString() &&
      conversation.members.receiver.toString() !== sender.toString()
    ) {
      return res.status(403).json({
        statusCode: STATUS_CODES[403],
        message: "You are not a member of this conversation",
      });
    }

    const newMessage = new messageModel({
      sender,
      senderType,
      conversation: conversationId,
      message,
    });

    await newMessage.save();
    return res.status(201).json({
      statusCode: STATUS_CODES[201],
      message: "Message sent successfully",
    });
  } catch (error) {
    res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};

exports.loadMessages = async (req, res) => {
  try {
    const conversationId = req.params.conversationId;
    const messages = await messageModel
      .find({ conversation: conversationId })
      .populate("sender")
      .populate("conversation")
      .populate({
        path: "conversation",
        populate: { path: "members.sender", model: "Consumer" },
      })
      .populate({
        path: "conversation",
        populate: { path: "members.receiver", model: "ServiceProvider" },
      })
      .sort({ createdAt: 1 });

    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      messages,
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};
