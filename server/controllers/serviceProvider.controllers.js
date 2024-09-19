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
const serviceModel = require("../models/service.models");
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
    const serviceProvider = await serviceProviderModel
      .findOne({ _id: req.serviceProvider._id })
      .populate("serviceProviderListedServices.service");

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

    const isDayExisted = await serviceProviderModel.findOne({
      _id: req.serviceProvider._id,
      "serviceProviderWorkingHours.dayOfWeek":
        serviceProviderWorkingHours.dayOfWeek,
    });

    if (isDayExisted) {
      return res.status(400).json({
        statusCode: STATUS_CODES[400],
        message: "Working hours for this day already exists",
      });
    }
    const serviceProvider = await serviceProviderModel.findOne({
      _id: req.serviceProvider._id,
    });
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
exports.addListedServices = async (req, res) => {
  try {
    const { serviceProviderListedServices } = req.body;
    const serviceProvider = await serviceProviderModel.findOne({
      _id: req.serviceProvider._id,
    });

    const currentServices = serviceProvider.serviceProviderListedServices;

    const duplicateServices = serviceProviderListedServices.filter(
      (newService) =>
        currentServices.some(
          (existingService) =>
            existingService.service.toString() === newService.service.toString()
        )
    );
    if (duplicateServices.length > 0) {
      return res.status(400).json({
        statusCode: STATUS_CODES[400],
        message: "Please select unique services",
      });
    }
    const updatedServices = [
      ...currentServices,
      ...serviceProviderListedServices,
    ];
    await serviceProviderModel.findByIdAndUpdate(
      { _id: req.serviceProvider._id },
      { serviceProviderListedServices: updatedServices },
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
    let posts = await servicePostModel
      .find({
        serviceProvider: req.serviceProvider._id,
      })
      .populate("service");

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
      "This order has been accepted"
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
        populate: {
          path: "service",
          model: serviceModel,
        },
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
        populate: {
          path: "service",
          model: serviceModel,
        },
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
        populate: {
          path: "service",
          model: serviceModel,
        },
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
        populate: {
          path: "service",
          model: serviceModel,
        },
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
        populate: {
          path: "service",
          model: serviceModel,
        },
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
        populate: {
          path: "service",
          model: serviceModel,
        },
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
