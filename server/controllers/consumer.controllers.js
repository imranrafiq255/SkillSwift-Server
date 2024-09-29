const { STATUS_CODES } = require("http");
const consumerModel = require("../models/consumer.models");
const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary");
const fileUri = require("../config/fileUri.config");
const {
  sendConfirmEmail,
  sendPasswordResetEmail,
  sendOrderEmail,
} = require("../config/email.config");
const bcrypt = require("bcrypt");
const serviceOrderModel = require("../models/serviceOrder.models");
const notificationModel = require("../models/notification.models");
const serviceProviderModel = require("../models/serviceProvider.models");
const disputeModel = require("../models/dispute.models");
const ratingModel = require("../models/Rating.models");
const servicePostModel = require("../models/servicePost.models");
const refundModel = require("../models/refund.models");
exports.signUp = async (req, res) => {
  try {
    const { consumerFullName, consumerEmail, consumerPassword } = req.body;
    const newConsumer = await new consumerModel({
      consumerFullName,
      consumerEmail,
      consumerPassword,
    }).save();
    const token = jwt.sign(
      {
        _id: newConsumer._id,
      },
      process.env.CONSUMER_EMAIL_SECRET_TOKEN,
      { expiresIn: "1h" }
    );
    const clientUrl =
      process.env.CLIENT_URL + "/consumer-confirm-email" + `/${token}`;
    sendConfirmEmail(newConsumer.consumerEmail, clientUrl);
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
      process.env.CONSUMER_EMAIL_SECRET_TOKEN,
      { expiresIn: "1h" }
    );
    if (!decodedToken) {
      return res.status(400).json({
        statusCode: STATUS_CODES[400],
        message: "Token is invalid",
      });
    }
    const consumer = await consumerModel.findByIdAndUpdate(
      { _id: decodedToken._id },
      { isEmailVerified: true },
      { new: true }
    );
    if (!consumer) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message:
          "Consumer not found in database with id '" + decodedToken._id + "'",
      });
    }
    const token = await jwt?.sign(
      {
        _id: consumer._id,
        consumerTokenVersion: consumer.consumerTokenVersion,
      },
      process.env.CONSUMER_SECRET_TOKEN
    );
    const options = {
      httpOnly: true,
      secure: true,
      maxAge: 1000 * 24 * 60 * 60 * 20,
    };
    res.cookie("consumerToken", token, options);
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
    const consumer = await consumerModel.findById({ _id: req.consumer._id });
    if (!consumer) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message: "Consumer not found in database with id '" + id + "'",
      });
    }
    const { consumerPhoneNumber, consumerAddress } = req.body;
    if (!req.file) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message: "Image is missing!",
      });
    }
    const upload = await cloudinary.v2.uploader.upload(fileUri(req.file));
    consumer.consumerPhoneNumber = consumerPhoneNumber;
    consumer.consumerAddress = consumerAddress;
    consumer.consumerAvatar = upload.secure_url;
    await consumer.save();
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      message:
        "Consumer details(phone number and profile avatar) is updated successfully",
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
    const { consumerAddress } = req.body;
    const consumer = await consumerModel.findById({ _id: req.consumer._id });
    consumer.consumerAddress = consumerAddress;
    await consumer.save();
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      message: "Consumer address added successfully",
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
    const { consumerEmail, consumerPassword } = req.body;

    if (!consumerEmail || !consumerPassword) {
      return res.status(400).json({
        statusCode: STATUS_CODES[400],
        message: "Email and password are required",
      });
    }

    const consumer = await consumerModel
      .findOne({ consumerEmail: consumerEmail.toLowerCase() })
      .select("+consumerPassword");

    if (!consumer) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message:
          "Consumer not found in database with email '" + consumerEmail + "'",
      });
    }

    if (!consumer.isEmailVerified) {
      return res.status(400).json({
        statusCode: STATUS_CODES[400],
        message: "Please verify your email before signing in",
      });
    }

    const isPasswordMatch = await bcrypt.compare(
      consumerPassword,
      consumer.consumerPassword
    );

    if (!isPasswordMatch) {
      return res.status(400).json({
        statusCode: STATUS_CODES[400],
        message: "Invalid password",
      });
    }

    const token = await jwt.sign(
      {
        _id: consumer._id,
        consumerTokenVersion: consumer.consumerTokenVersion,
      },
      process.env.CONSUMER_SECRET_TOKEN
    );

    const options = {
      httpOnly: true,
      secure: true,
      maxAge: 1000 * 24 * 60 * 60 * 20,
    };

    res.cookie("consumerToken", token, options);

    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      message: "Consumer signed in successfully",
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};
exports.logout = async (req, res) => {
  try {
    res.clearCookie("consumerToken");
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      message: "Consumer logged out successfully",
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};
exports.loadCurrentConsumer = async (req, res) => {
  try {
    res.status(200).json({
      statusCode: STATUS_CODES[200],
      consumer: req.consumer,
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
    const { consumerEmail } = req.body;
    const consumer = await consumerModel.findOne({
      consumerEmail: consumerEmail.toLowerCase(),
    });
    if (!consumer) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message:
          "Consumer not found in database with email '" + consumerEmail + "'",
      });
    }
    const token = jwt.sign(
      { _id: consumer._id },
      process.env.FORGOT_PASSWORD_SECRET_TOKEN,
      { expiresIn: "1h" }
    );

    const clientUrl =
      process.env.CLIENT_URL + "/consumer-reset-password" + `/${token}`;
    sendPasswordResetEmail(consumer.consumerEmail, clientUrl);
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
    const decodedToken = await jwt.verify(
      token,
      process.env.FORGOT_PASSWORD_SECRET_TOKEN
    );
    if (!decodedToken) {
      return res.status(400).json({
        statusCode: STATUS_CODES[400],
        message: "Token is invalid",
      });
    }
    const { consumerPassword } = req.body;
    if (!consumerPassword) {
      return res.status(400).json({
        statusCode: STATUS_CODES[400],
        message: "Password is required",
      });
    }
    const consumer = await consumerModel.findByIdAndUpdate(
      { _id: decodedToken._id },
      {
        consumerPassword: await bcrypt.hash(consumerPassword, 10),
      },
      { new: true }
    );
    consumer.consumerTokenVersion = consumer.consumerTokenVersion + 1;
    await consumer.save();
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
exports.orderService = async (req, res) => {
  try {
    const { serviceProvider, servicePost, orderDeliverySchedule } = req.body;
    const existedOrder = await serviceOrderModel.findOne({
      servicePost,
      serviceProvider,
      serviceOrderBy: req.consumer._id,
    });
    const service_provider = await serviceProviderModel.findOne({
      _id: serviceProvider,
    });
    if (!service_provider) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message: "Service provider not found",
      });
    }
    if (existedOrder) {
      if (existedOrder.orderStatus === "pending") {
        return res.status(400).json({
          statusCode: STATUS_CODES[400],
          message: "You have already ordered this service",
        });
      }
      if (existedOrder.orderStatus === "accepted") {
        return res.status(400).json({
          statusCode: STATUS_CODES[400],
          message:
            "Your order for this service is already accepted, you can't order until your order is not completed",
        });
      }
    }
    let order = await new serviceOrderModel({
      serviceOrderBy: req.consumer._id,
      serviceProvider,
      servicePost,
      orderDeliverySchedule,
    }).save();
    order = await serviceOrderModel
      .findOne({ _id: order._id })
      .populate("servicePost");
    sendOrderEmail(
      service_provider.serviceProviderEmail,
      "Order Information",
      {
        orderToName: service_provider.serviceProviderFullName,
        _id: order._id,
        servicePostMessage: order.servicePost.servicePostMessage,
        orderByName: req.consumer.consumerFullName,
      },
      "Your order has been placed ",
      "Ordered By"
    );
    await new notificationModel({
      notificationMessage: `Your order has been placed please see details below:`,
      notificationSendBy: req.consumer._id,
      notificationReceivedBy: order.serviceProvider,
      notificationType: order._id,
    }).save();

    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      message: "Your order placed successfully",
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
    let order = await serviceOrderModel.findOne({
      _id: id,
      serviceOrderBy: req.consumer._id,
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
    order.orderStatus = "cancelled";
    await order.save();
    const service_provider = await serviceProviderModel.findOne({
      _id: order.serviceProvider,
    });
    if (!service_provider) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message: "Service provider not found",
      });
    }
    sendOrderEmail(
      service_provider.serviceProviderEmail,
      "Order Information",
      {
        orderToName: service_provider.serviceProviderFullName,
        _id: order._id,
        servicePostMessage: order.servicePost.servicePostMessage,
        orderByName: req.consumer.consumerFullName,
      },
      "Your order has been rejected please see details below: ",
      "Rejected By"
    );
    await new notificationModel({
      notificationMessage: `Order #${order._id} has been rejected by ${req.consumer.serviceProviderFullName}`,
      notificationSendBy: req.consumer._id,
      notificationReceivedBy: order.serviceProvider,
      notificationType: order._id,
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
exports.loadOrders = async (req, res) => {
  try {
    const orders = await serviceOrderModel
      .find({
        serviceOrderBy: req.consumer._id,
      })
      .populate("serviceProvider")
      .populate("servicePost");
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      orders,
    });
  } catch (error) {
    res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};
exports.loadNewNotifications = async (req, res) => {
  try {
    const notifications = await notificationModel
      .find({
        notificationReceivedBy: req.consumer._id,
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
    const notification = await notificationModel.findByIdAndUpdate(
      { _id: id, notificationReceivedBy: req.consumer._id },
      { notificationRead: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message: "No notification found with given id" + id,
      });
    }
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      message: "Notification read successfully",
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS,
      message: error.message,
    });
  }
};
exports.fileDispute = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message: "Id parameter is missing",
      });
    }
    const serviceProvider = await serviceProviderModel.findOne({
      _id: id,
    });
    if (!serviceProvider) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message: "Service provider not found",
      });
    }
    const dispute = await disputeModel.findOne({
      disputeFiledBy: req.consumer._id,
      disputeFiledAgainst: id,
      order: order,
    });
    if (dispute) {
      return res.status(400).json({
        statusCode: STATUS_CODES[400],
        message:
          "You have already filed a dispute against this service provider",
      });
    }
    const { disputeTitle, disputeDetails, order } = req.body;
    await new disputeModel({
      disputeTitle,
      disputeDetails,
      disputeFiledBy: req.consumer._id,
      disputeFiledAgainst: id,
      order,
    }).save();
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      message:
        "Dispute is filed against " +
        serviceProvider.serviceProviderFullName +
        " succesfully",
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
    const disputes = await disputeModel
      .find({
        disputeFiledBy: req.consumer._id,
      })
      .populate("disputeFiledBy")
      .populate("disputeFiledAgainst")
      .populate("order")
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
exports.deleteDispute = async (req, res) => {
  try {
    const id = req.consumer._id;
    if (!id) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message: "Id parameter is missing",
      });
    }
    const dispute = await disputeModel.findOneAndDelete({
      _id: id,
      disputeFiledBy: req.consumer._id,
    });
    if (!dispute) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message: "No dispute found with given id" + id,
      });
    }
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      message: "Dispute deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};
exports.addRating = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message: "Id paramter is required",
      });
    }
    const servicePost = await servicePostModel.findOne({ _id: id });
    if (!servicePost) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message: "Service post not found with given id",
      });
    }
    const isRatingExisted = servicePost.servicePostRatings.find(
      (rating) => rating.consumerId.toString() === req.consumer._id.toString()
    );

    if (isRatingExisted) {
      return res.status(400).json({
        statusCode: STATUS_CODES[400],
        message: "You have already rated this service post",
      });
    }

    const { ratingStars } = req.body;
    servicePost.servicePostRatings.push({
      consumerId: req?.consumer?._id,
      rating: ratingStars,
    });
    await servicePost.save();
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      message: "You rated service post successfully",
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};
exports.submitRefundRequest = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message: "Id parameter is missing",
      });
    }
    const serviceProvider = await serviceProviderModel.findOne({ _id: id });
    if (!serviceProvider) {
      return res.status(404).json({
        statusCode: STATUS_CODES[404],
        message: "Service provider does not exist with id '" + id + "'",
      });
    }
    const isRefundRequestExisted = await refundModel.findOne({
      refundRequestedBy: req.consumer._id,
      refundRequestedAgainst: id,
      refundAmountStatus: "pending",
    });
    if (isRefundRequestExisted) {
      return res.status(400).json({
        statusCode: STATUS_CODES[400],
        message:
          "You have already submitted a refund request against this service provider",
      });
    }
    const { refundAmount, refundDetails } = req.body;
    await new refundModel({
      refundRequestedBy: req.consumer._id,
      refundRequestedAgainst: id,
      refundAmount,
      refundDetails,
    }).save();
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      message:
        "Refund request submitted successfully, please wait for approval or rejection",
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};
exports.loadRecentServicePosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const servicePosts = await servicePostModel
      .find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("serviceProvider");
    const totalPosts = await servicePostModel.countDocuments();

    const hasMore = skip + limit < totalPosts;

    return res.status(200).json({
      statusCode: 200,
      servicePosts,
      hasMore,
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: 500,
      message: error.message,
    });
  }
};

exports.loadPopularServicePosts = async (req, res) => {
  try {
    const all = req.query.all;
    if (all) {
      const servicePosts = await servicePostModel
        .find()
        .sort({ servicePostRatings: -1 })
        .populate("serviceProvider");
      return res.status(200).json({
        statusCode: STATUS_CODES[200],
        servicePosts,
      });
    }
    const servicePosts = await servicePostModel
      .find()
      .populate("serviceProvider")
      .sort({ servicePostRatings: -1 })
      .limit(8);
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

exports.refundAmountRequest = async (req, res) => {
  try {
    const {
      refundRequestedAgainst,
      order,
      refundAmountPercentage,
      refundDetails,
    } = req.body;
    const refund = await refundModel.findOne({
      refundRequestedBy: req.consumer._id,
      refundRequestedAgainst,
      order,
    });
    if (refund) {
      return res.status(403).json({
        statusCode: STATUS_CODES[403],
        message: "Refund request is already pending",
      });
    }
    await new refundModel({
      refundRequestedBy: req.consumer._id,
      refundRequestedAgainst,
      order,
      refundAmountPercentage,
      refundDetails,
    }).save();
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      message: "Refund request submitted successfully",
    });
  } catch (error) {
    res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};

exports.loadAllRefunds = async (req, res) => {
  try {
    const refunds = await refundModel
      .find({ refundRequestedBy: req.consumer._id })
      .populate("refundRequestedAgainst")
      .populate("order")
      .populate({
        path: "order",
        populate: {
          path: "servicePost",
          model: "ServicePost",
        },
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

exports.changeConsumerAddress = async (req, res) => {
  try {
    const { consumerAddress } = req.body;
    const consumer = await consumerModel.findOne({ _id: req?.consumer?._id });
    consumer.consumerAddress = consumerAddress;
    await consumer?.save();
    return res.status(200).json({
      statusCode: STATUS_CODES[200],
      message: "Consumer address updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};
