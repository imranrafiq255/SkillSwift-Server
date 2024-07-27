const { STATUS_CODES } = require("http");
const consumerModel = require("../models/consumer.models");
const jwt = require("jsonwebtoken");
const isConsumerAuthenticated = async (req, res, next) => {
  try {
    const { consumerToken } = req.cookies;
    if (!consumerToken) {
      return res.status(401).json({
        statusCode: STATUS_CODES[401],
        message: "Consumer not authenticated",
      });
    }
    const decodedToken = jwt.verify(
      consumerToken,
      process.env.CONSUMER_SECRET_TOKEN
    );
    if (!decodedToken) {
      return res.status(401).json({
        statusCode: STATUS_CODES[401],
        message: "Token is invalid",
      });
    }
    const consumer = await consumerModel.findOne({ _id: decodedToken._id });
    if (!consumer) {
      res.clearCookie("consumerToken");
      return res.status(401).json({
        statusCode: STATUS_CODES[401],
        message:
          "Consumer not found in db, please login again or create another account.",
      });
    }
    if (consumer.consumerTokenVersion !== decodedToken.consumerTokenVersion) {
      res.clearCookie("consumerToken");
      return res.status(401).json({
        statusCode: STATUS_CODES[401],
        message:
          "Token version mismatch, please login again or create another account.",
      });
    }
    req.consumer = consumer;
    next();
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};

module.exports = isConsumerAuthenticated;
