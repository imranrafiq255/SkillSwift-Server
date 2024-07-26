const mongoose = require("mongoose");

const serviceSchema = mongoose.Schema(
  {
    serviceName: {
      type: String,
      required: [true, "Service name is required"],
      minlength: 3,
      maxlength: 50,
    },
    serviceDescription: {
      type: String,
      required: [true, "Service description is required"],
      minlength: 10,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

const serviceModel = mongoose.model("Service", serviceSchema);

module.exports = serviceModel;
