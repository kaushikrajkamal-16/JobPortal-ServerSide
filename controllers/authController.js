const {
  isValidEmail,
  makeInitials,
  isStrongPassword,
  generateOTP,
  generateAccessToken,
} = require("../utils/helpers");
const { sendMail } = require("../utils/mail/mailService");
const userSchema = require("../model/User");

const {
  uploadToCloudinary,
  deleteFromCloudinary,
} = require("../utils/uploadToCloudinary");

const cleanEmail = (email) => (email || "").toLowerCase().trim();

// <---------------------------Registration-------------------------------------->
// POST /api/v1/auth/register
// Body (Registration.jsx): { fullName, email, password, role }   role = "applicant" or "company"
const Registration = async (req, res) => {
  // Registration.jsx sends "fullName" — also accept "name"
  const name = (req.body.name || req.body.fullName || "").trim();
  const email = cleanEmail(req.body.email);
  const { password } = req.body;
  let { role } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required.",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Email is not valid.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters.",
      });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password needs an uppercase letter, a lowercase letter, a number and a symbol (e.g. Rahim@123).",
      });
    }

    // Registration.jsx may say "employer" — we save it as "company"
    if (role === "employer") role = "company";

    // Only applicants and companies can register.
    // Admins are NOT allowed here (the first admin is made by: npm run seed)
    if (role && !["applicant", "company"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Must be applicant or company.",
      });
    }

    const existingUser = await userSchema.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const emailverifyotp = generateOTP();

    const user = await userSchema.create({
      name,
      initials: makeInitials(name),
      email,
      password, // hashed automatically by the schema (pre "save")
      role: role || "applicant",
      emailverifyotp,
      otpPurpose: "verify",
      emailverifyotpExpiry: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    await sendMail({
      email: user.email,
      subject: "OTP Verification Mail",
      otp: emailverifyotp,
    });

    // Send back only safe fields (never the password or OTP)
    // Frontend: navigate("/verifyOtp", { state: { email, from: "register" } })
    return res.status(201).json({
      success: true,
      message: "Registration successful. Please verify your email.",
      user: {
        id: user._id,
        name: user.name,
        initials: user.initials,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

// <---------------------------VerifyEmail-------------------------------------->
// POST /api/v1/auth/verifyEmail
// Body (VerifyOtp.jsx): { email, otp, from }   from = "register" or "forgot"
const VerifyEmail = async (req, res) => {
  // Clean inputs: "  Rahim@Gmail.com " → "rahim@gmail.com"
  const email = (req.body.email || "").toLowerCase().trim();
  const otp = String(req.body.otp || "").trim();
  const { from } = req.body;

  try {
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required.",
      });
    }

    const user = await userSchema.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email.",
      });
    }

    // ---------- Forgot Password flow (uses resetotp) ----------
    if (from === "forgot") {
      if (
        !user.resetotp ||
        user.resetotp !== otp ||
        user.otpPurpose !== "reset"
      ) {
        return res.status(400).json({
          success: false,
          message: "Wrong OTP. Please check the code and try again.",
        });
      }

      if (user.resetotpExpiry < Date.now()) {
        return res.status(400).json({
          success: false,
          message: "OTP has expired. Please request a new one.",
        });
      }

      // Keep the code — Reset Password will check it again
      return res.status(200).json({
        success: true,
        message: "Code is correct. Set your new password.",
      });
    }

    // ---------- Registration flow (uses emailverifyotp) ----------
    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified. Please log in.",
      });
    }

    if (!user.emailverifyotp || user.emailverifyotp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Wrong OTP. Please check the code and try again.",
      });
    }

    if (user.emailverifyotpExpiry < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    // Correct code → verify the user and remove the used OTP
    user.isVerified = true;
    user.emailverifyotp = undefined;
    user.emailverifyotpExpiry = undefined;
    user.otpPurpose = undefined;
    await user.save(); // password is not changed, so it is NOT hashed again

    return res.status(200).json({
      success: true,
      message: "Email verified successfully. You can now log in.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

// <---------------------------Login-------------------------------------->
// POST /api/v1/auth/login
// Body (Login.jsx): { email, password }
const login = async (req, res) => {
  const email = cleanEmail(req.body.email);
  const { password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Email is not valid.",
      });
    }

    const user = await userSchema.findOne({ email });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Your email is not verified. Please verify it first.",
      });
    }

    const isMatchPass = await user.ComparePassword(password);

    if (!isMatchPass) {
      return res.status(400).json({
        success: false,
        message: "Password is incorrect",
      });
    }

    const accessToken = generateAccessToken({
      _id: user._id,
      email: user.email,
      role: user.role,
    });

    res.cookie("accessToken", accessToken, {
      httpOnly: true, // JavaScript in the browser can't read it (safer)
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    // Frontend uses "role" to go to the right dashboard
    return res.status(200).json({
      success: true,
      message: "login Successfully",
      accessToken: accessToken,
      user: {
        id: user._id,
        name: user.name,
        initials: user.initials,
        email: user.email,
        role: user.role,
        photo: user.photo,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// <---------------------------Logout-------------------------------------->
// POST /api/v1/auth/logout   (Navbar / Sidebar "Logout" button)
const Logout = async (req, res) => {
  res.clearCookie("accessToken", { httpOnly: true, sameSite: "lax" });
  return res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
};

// <---------------------------ResendOtp-------------------------------------->
// POST /api/v1/auth/resendOtp   (VerifyOtp.jsx "Resend code" link)
// Body: { email, from }   from = "register" or "forgot"
const ResendOtp = async (req, res) => {
  const email = cleanEmail(req.body.email);
  const { from } = req.body;

  try {
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const user = await userSchema.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email.",
      });
    }

    const otp = generateOTP();

    if (from === "forgot") {
      user.resetotp = otp;
      user.resetotpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
      user.otpPurpose = "reset";
    } else {
      if (user.isVerified) {
        return res.status(400).json({
          success: false,
          message: "Email is already verified. Please log in.",
        });
      }
      user.emailverifyotp = otp;
      user.emailverifyotpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
      user.otpPurpose = "verify";
    }
    await user.save();

    await sendMail({
      email: user.email,
      subject: from === "forgot" ? "Reset Password OTP" : "OTP Verification Mail",
      otp,
    });

    return res.status(200).json({
      success: true,
      message: "A new 6-digit code was sent to your email.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

// <---------------------------ForgotPassword-------------------------------------->
// POST /api/v1/auth/forgotPassword
// Body (ForgotPassword.jsx): { email }
const ForgotPassword = async (req, res) => {
  const email = cleanEmail(req.body.email);
  try {
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Email is not valid.",
      });
    }

    const user = await userSchema.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email.",
      });
    }

    // Make a new code for resetting the password
    const otp = generateOTP();
    user.resetotp = otp;
    user.otpPurpose = "reset";
    user.resetotpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save(); // password is not changed, so it is NOT hashed again

    await sendMail({
      email: user.email,
      subject: "Reset Password OTP",
      otp,
    });

    // Frontend: navigate("/verifyOtp", { state: { email, from: "forgot" } })
    return res.status(200).json({
      success: true,
      message: "We sent a 6-digit code to your email.",
      email: user.email,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

// <---------------------------ResetPassword-------------------------------------->
// POST /api/v1/auth/resetpassword
// Body (ResetPassword.jsx): { email, otp, password, confirmPassword }
const ResetPassword = async (req, res) => {
  // Clean email: "  Rahim@Gmail.com " → "rahim@gmail.com"
  const email = (req.body.email || "").toLowerCase().trim();
  const otp = String(req.body.otp || "").trim();
  const { password, confirmPassword } = req.body;

  try {
    if (!email || !otp || !password) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP, and new password are required.",
      });
    }

    // confirmPassword is optional — check it only if the frontend sends it
    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters.",
      });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password needs an uppercase letter, a lowercase letter, a number and a symbol (e.g. Rahim@123).",
      });
    }

    const user = await userSchema.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email.",
      });
    }

    // The code must be the one from Forgot Password
    if (
      !user.resetotp ||
      user.resetotp !== otp ||
      user.otpPurpose !== "reset"
    ) {
      return res.status(400).json({
        success: false,
        message: "Wrong code. Please start Forgot Password again.",
      });
    }

    if (user.resetotpExpiry < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "Code has expired. Please start Forgot Password again.",
      });
    }

    // Save the new password and remove the used code
    user.password = password; // hashed automatically by the schema (pre "save")
    user.isVerified = true; // they proved they own this email
    user.resetotp = undefined;
    user.resetotpExpiry = undefined;
    user.otpPurpose = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully. Please log in.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

// <---------------------------GetMe-------------------------------------->
// GET /api/v1/auth/getme   (any logged-in user — dashboards use it to show the profile)
const GetMe = async (req, res) => {
  try {
    // req.user comes from authMiddleware (the logged-in user)
    const user = await userSchema
      .findById(req.user._id)
      .select(
        "-password -emailverifyotp -emailverifyotpExpiry -resetotp -resetotpExpiry -otpPurpose -photoPublicId",
      );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

// <---------------------------UpdateProfile-------------------------------------->

const allowedFields = {
  applicant: ["name", "phone", "department", "batch"],
  company: ["name", "phone", "industry", "description", "address", "website"],
  admin: ["name", "phone", "office"],
};

// PUT /api/v1/auth/updateprofile   (any logged-in user: applicant, company, admin)
// Form data: text fields + photo (file, optional)
const UpdateProfile = async (req, res) => {
  try {
    const user = await userSchema.findById(req.user._id); // req.user comes from authMiddleware

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // 1. Update only the fields this role is allowed to change
    allowedFields[user.role].forEach((field) => {
      if (req.body[field] !== undefined) {
        user[field] = String(req.body[field]).trim();
      }
    });

    // Name changed → make new initials
    if (req.body.name) {
      user.initials = makeInitials(user.name);
    }

    // 2. New photo (applicant/admin photo or company logo) → Cloudinary
    if (req.file) {
      const folder =
        user.role === "company" ? "jobportal/logos" : "jobportal/photos";
      const uploaded = await uploadToCloudinary(req.file, folder);
      await deleteFromCloudinary(user.photoPublicId); // remove the old one
      user.photo = uploaded.url;
      user.photoPublicId = uploaded.publicId;
    }

    await user.save(); // password is not changed, so it is NOT hashed again

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: {
        id: user._id,
        name: user.name,
        initials: user.initials,
        email: user.email,
        role: user.role,
        phone: user.phone,
        photo: user.photo,
        department: user.department,
        batch: user.batch,
        industry: user.industry,
        description: user.description,
        address: user.address,
        website: user.website,
        office: user.office,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

module.exports = {
  Registration,
  VerifyEmail,
  login,
  Logout,
  ResendOtp,
  ForgotPassword,
  ResetPassword,
  GetMe,
  UpdateProfile,
};
