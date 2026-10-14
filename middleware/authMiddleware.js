const jwt = require("jsonwebtoken");
const userSchema = require("./../model/User");

// Checks the "accessToken" cookie (set by login) and puts the user in req.user
const authMiddleware = async (req, res, next) => {
  try {
    // 1. Read the token from the cookie
    const accessToken = req.cookies?.accessToken;

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        message: "Access token missing. Please log in.",
      });
    }

    // 2. Check the token with our secret key
    const decoded = jwt.verify(accessToken, process.env.JWT_SEC);

    // 3. Find the user (without the password)
    const user = await userSchema.findById(decoded._id).select("-password");

    // The user was deleted (e.g. by admin) but the cookie is still there
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found. Please log in again.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error.message);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired access token.",
    });
  }
};

module.exports = authMiddleware;
