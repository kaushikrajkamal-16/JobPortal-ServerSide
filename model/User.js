const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// One model for all 3 roles: applicant, company, admin
const userSchema = new mongoose.Schema(
  {
    // ---- Login ----
    name: { type: String, required: true, trim: true }, // person's name, or company name
    initials: String, // "Rahim Ahmed" → "RA"
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["applicant", "company", "admin"],
      default: "applicant",
    },
    isVerified: { type: Boolean, default: false },

    // ---- OTP ----
    emailverifyotp: String, // for Verify Email
    otpPurpose: { type: String, enum: ["verify", "reset"] },
    emailverifyotpExpiry: Date,
    resetotp: String, // for Forgot Password
    resetotpExpiry: Date,

    // ---- Profile ----
    phone: String,
    photo: String,
    photoPublicId: String,

    // Applicant only
    department: String,
    batch: String,
    isFlagged: { type: Boolean, default: false },

    // Company only
    industry: String,
    description: String,
    address: String,
    website: String,

    // Admin only
    office: String,

    // Which admin added this user (Add Applicant / Add Company)
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// Hash the password automatically before saving
// (so controllers can pass the plain password to create())
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return; // only when the password is new or changed
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.ComparePassword = async function (plainpassword) {
  return await bcrypt.compare(plainpassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
