const mongoose = require("mongoose");

// MONGO_URI comes from the .env file (never write the password in code)
const db = function dbConnect() {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
      console.log("Database is connected");
    })
    .catch((error) => {
      console.log(`Database is not connected ${error}`);
    });
};

module.exports = db;
