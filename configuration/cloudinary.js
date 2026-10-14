const cloudinary = require("cloudinary").v2;

// Keys come from the .env file (never write them in code)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Test the connection
(async () => {
  try {
    await cloudinary.api.ping();
    console.log("Cloudinary is connected successfully");
  } catch (error) {
    console.log(`Cloudinary is not connected: ${error.message}`);
  }
})();

module.exports = cloudinary;
