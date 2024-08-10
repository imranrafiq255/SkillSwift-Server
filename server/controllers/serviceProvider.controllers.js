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
exports.signUp = async (req, res) => {
  try {
    const {
      serviceProviderFullName,
      serviceProviderEmail,
      serviceProviderPassword,
    } = req.body;
    const newServiceProvider = await new serviceProviderModel({
      serviceProviderFullName,
      serviceProviderEmail,
      serviceProviderPassword,
    }).save();
    const token = jwt.sign(
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
      secure: true,
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
    const { serviceProviderPhoneNumber } = req.body;
    if (!req.file) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message: "Image is missing!",
      });
    }
    const upload = await cloudinary.v2.uploader.upload(fileUri(req.file));
    serviceProvider.serviceProviderPhoneNumber = serviceProviderPhoneNumber;
    serviceProvider.serviceProviderAvatar = upload.secure_url;
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
        message: "Invalid password",
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
      secure: true,
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
    res.status(200).json({
      statusCode: STATUS_CODES[200],
      serviceProvider: req.serviceProvider,
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
    const serviceProvider = await serviceProviderModel.findByIdAndUpdate(
      { _id: decodedToken._id },
      {
        serviceProviderPassword: await bcrypt.hash(newPassword, 10),
      },
      { new: true }
    );
    serviceProvider.serviceProviderTokenVersion =
      serviceProvider.serviceProviderTokenVersion + 1;
    await serviceProvider.save();
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
exports.setWorkingHours = async (req, res) => {
  try {
    const { serviceProviderWorkingHours } = req.body;
    const isDayExisted = await serviceProviderModel.findOne({
      "serviceProviderWorkingHours.dayOfWeek":
        serviceProviderWorkingHours.dayOfWeek,
    });
    if (isDayExisted) {
      return res.status(400).json({
        statusCode: STATUS_CODES[400],
        message: "Working hours for this day already exists",
      });
    }
    await serviceProviderModel.findByIdAndUpdate(
      { _id: req.serviceProvider._id },
      { serviceProviderWorkingHours },
      { new: true }
    );
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
exports.addCNICDetails = async (req, res) => {
  try {
    const { serviceProviderCNICNumber } = req.body;
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
    serviceProvider.serviceProviderCNICNumber = serviceProviderCNICNumber;
    await serviceProvider.save();
    return res.status(200).json({
      statusCode: 200,
      message:
        "Service provider details (CNIC Number and CNIC images) are updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};
exports.addListedServices = async (req, res) => {
  try {
    const { serviceProviderListedServices } = req.body;
    await serviceProviderModel.findByIdAndUpdate(
      { _id: req.serviceProvider._id },
      { serviceProviderListedServices },
      { new: true }
    );
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      message: "Service provider listed services updated successfully",
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
    const { service, servicePostMessage, servicePostPrice } = req.body;
    if (!req.file) {
      return res.status(400).json({
        statusCode: 400,
        message: "Service post image is required!",
      });
    }
    const upload = await cloudinary.v2.uploader.upload(fileUri(req.file));
    await new servicePostModel({
      service,
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
    const servicePosts = await servicePostModel.find({
      serviceProvider: req.serviceProvider._id,
    });
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      servicePosts,
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
    const { orderDeliverySchedule } = req.body;
    if (!orderDeliverySchedule) {
      return res.status(400).json({
        statusCode: STATUS_CODES[400],
        message: "Order delivery schedule is required",
      });
    }
    const id = req.params.id;
    if (!id) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message: "Id parameter is missing",
      });
    }
    const order = await serviceOrderModel.findByIdAndUpdate(
      { _id: id, serviceProvider: req.serviceProvider._id },
      { orderDeliverySchedule, orderStatus: "accepted" },
      { new: true }
    );
    sendOrderEmail(
      order.serviceOrderBy.consumerEmail,
      "Order Information",
      {
        orderToName: order?.serviceOrderBy.consumerFullName,
        orderByName: req.serviceProvider.serviceProviderFullName,
        servicePostMessage: order.servicePost.servicePostMessage,
        _id: order._id,
      },
      "This order has been accepted and will be delivered on " +
        orderDeliverySchedule,
      "Order Accepted By"
    );
    await new notificationModel({
      notificationMessage: `Order #${order._id} has been accepted by ${req.serviceProvider.serviceProviderFullName}`,
      notificationSendBy: req.serviceProvider._id,
      notificationReceivedBy: order.serviceOrderBy,
    }).save();
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
    const order = await serviceOrderModel.findOne({
      _id: id,
      serviceProvider: req.serviceProvider._id,
    });
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
    const rejectedOrder = await serviceOrderModel.findByIdAndDelete({
      _id: id,
    });
    if (!rejectedOrder) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message: "No order found with given id" + id,
      });
    }
    await new notificationModel({
      notificationMessage: `Order #${rejectedOrder._id} has been rejected by ${req.serviceProvider.serviceProviderFullName}`,
      notificationSendBy: req.serviceProvider._id,
      notificationReceivedBy: rejectedOrder.serviceOrderBy,
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
    const order = await serviceOrderModel.findOne({
      _id: id,
      serviceProvider: req.serviceProvider._id,
    });
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
    const cancelledOrder = await serviceOrderModel
      .findByIdAndDelete({
        _id: id,
      })
      .populate("serviceOrderBy")
      .populate("servicePost");
    if (!cancelledOrder) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message: "No order found with given id" + id,
      });
    }
    sendOrderEmail(
      cancelledOrder.serviceOrderBy.consumerEmail,
      "Order Information",
      {
        orderToName: cancelledOrder?.serviceOrderBy.consumerFullName,
        orderByName: req.serviceProvider.serviceProviderFullName,
        servicePostMessage: cancelledOrder.servicePost.servicePostMessage,
        _id: cancelledOrder._id,
      },
      "This order has been cancelled with details below:",
      "Order Cancelled By"
    );
    await new notificationModel({
      notificationMessage: `Order #${cancelledOrder._id} has been cancelled by ${req.serviceProvider.serviceProviderFullName}`,
      notificationSendBy: req.serviceProvider._id,
      notificationReceivedBy: cancelledOrder.serviceOrderBy,
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
exports.loadOrders = async (req, res) => {
  try {
    const orders = await serviceOrderModel.find({
      serviceProvider: req.serviceProvider._id,
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
exports.loadAllNewNotifications = async (req, res) => {
  try {
    const notifications = await notificationModel
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
