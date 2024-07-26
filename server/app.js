require("dotenv").config();
const cookieParser = require("cookie-parser");
const express = require("express");
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
require("./config/dbConnection.config")(process.env.MONGO_URI);
module.exports = app;
