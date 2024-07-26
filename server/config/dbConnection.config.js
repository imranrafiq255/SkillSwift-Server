const mongoose = require("mongoose");

const dbConnection = async (MONGO_URI) => {
  mongoose
    .connect(MONGO_URI)
    .then((con) =>
      console.log(`MongoDB is connected on: ${con.connection.host}`)
    )
    .catch((err) => console.log(err));
};

module.exports = dbConnection;
