const { STATUS_CODES } = require("http");
const jwt = require("jsonwebtoken");
const serviceProviderModel = require("../models/serviceProvider.models");
const isServiceProviderAuthenticated = async (req, res, next) => {
  try {
    const { serviceProviderToken } = req.cookies;
    if (!serviceProviderToken) {
      return res.status(401).json({
        statusCode: STATUS_CODES[401],
        message: "Service provider not authenticated",
      });
    }
    const decodedToken = jwt.verify(
      serviceProviderToken,
      process.env.SERVICE_PROVIDER_SECRET_TOKEN
    );
    if (!decodedToken) {
      return res.status(401).json({
        statusCode: STATUS_CODES[401],
        message: "Token is invalid",
      });
    }
    const serviceProvider = await serviceProviderModel.findOne({
      _id: decodedToken._id,
    });
    if (!serviceProvider) {
      res.clearCookie("serviceProviderToken");
      return res.status(401).json({
        statusCode: STATUS_CODES[401],
        message:
          "Service provider not found in database with id '" +
          decodedToken._id +
          "'",
      });
    }
    if (
      serviceProvider.serviceProviderTokenVersion !==
      decodedToken.serviceProviderTokenVersion
    ) {
      res.clearCookie("serviceProviderToken");
      return res.status(401).json({
        statusCode: STATUS_CODES[401],
        message:
          "Token version mismatch, please login again or create another account.",
      });
    }
    req.serviceProvider = serviceProvider;
    next();
  } catch (error) {
    return res.status(500).json({
      statusCode: STATUS_CODES[500],
      message: error.message,
    });
  }
};

module.exports = isServiceProviderAuthenticated;
