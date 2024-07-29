require("dotenv").config();
const cookieParser = require("cookie-parser");
const express = require("express");
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
require("./config/dbConnection.config")(process.env.MONGO_URI);
require("./config/cloudinary.config")();

const Consumer = require("./routes/consumer.routes");
const serviceProvider = require("./routes/serviceProvider.routes");
const Admin = require("./routes/admin.routes");
app.use("/api/v1/consumer", Consumer);
app.use("/api/v1/service-provider", serviceProvider);
app.use("/api/v1/admin", Admin);
module.exports = app;
