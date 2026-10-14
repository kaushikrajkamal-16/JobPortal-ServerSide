const express = require("express");
const router = express.Router();
const authController = require("../../controllers/authController");
const authMiddleware = require("../../middleware/authMiddleware");
const { uploadImage } = require("../../middleware/upload");

// ---- No login needed ----
router.post("/register", authController.Registration); // POST /api/v1/auth/register
router.post("/verifyEmail", authController.VerifyEmail); // POST /api/v1/auth/verifyEmail
router.post("/resendOtp", authController.ResendOtp); // POST /api/v1/auth/resendOtp
router.post("/login", authController.login); // POST /api/v1/auth/login  (was GET — a GET can't send a body from the browser)
router.post("/forgotPassword", authController.ForgotPassword); // POST /api/v1/auth/forgotPassword
router.post("/resetpassword", authController.ResetPassword); // POST /api/v1/auth/resetpassword

// ---- Must be logged in (any role) ----
router.post("/logout", authController.Logout); // POST /api/v1/auth/logout
router.get("/getme", authMiddleware, authController.GetMe); // GET /api/v1/auth/getme  (was PUT)
router.put(
  "/updateprofile",
  authMiddleware,
  uploadImage.single("photo"),
  authController.UpdateProfile,
); // PUT /api/v1/auth/updateprofile  (form-data)

module.exports = router;
