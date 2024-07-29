const { STATUS_CODES } = require("http");
const serviceProviderModel = require("../models/serviceProvider.models");
const jwt = require("jsonwebtoken");
const {
  sendConfirmEmail,
  sendPasswordResetEmail,
} = require("../config/email.config");
const fileUri = require("../config/fileUri.config");
const cloudinary = require("cloudinary");
const bcrypt = require("bcrypt");
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
