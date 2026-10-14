// "TechSoft Ltd." → "TL"

//Initials
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const makeInitials = (name = "") => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
};

// strongPasswordRegex

const strongPasswordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#_\-+=.,:;])[A-Za-z\d@$!%*?&#_\-+=.,:;]{8,}$/;

function isStrongPassword(password) {
  return strongPasswordRegex.test(password);
}

// validEmail

const emailRegex =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

function isValidEmail(email) {
  if (!email || email.length > 254) return false;

  if (!emailRegex.test(email)) return false;

  const parts = email.split("@");
  if (parts[0].length > 64) return false;

  const domainParts = parts[1].split(".");
  if (domainParts.some((part) => part.length > 63)) return false;

  return true;
}

// generateOtp

function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

const generateAccessToken = (user) => {
  // expires in 1 day (same as the cookie)
  const token = jwt.sign(user, process.env.JWT_SEC, { expiresIn: "1d" });
  return token;
};

// makeSlug
// "Frontend Developer" + "TechSoft Ltd." → "frontend-developer-techsoft-ltd-k3x9"
const makeSlug = (...parts) => {
  const text = parts
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // spaces & symbols → "-"
    .replace(/^-+|-+$/g, ""); // remove "-" at start/end
  const random = Math.random().toString(36).slice(2, 6); // 4 random letters, so slugs never repeat
  return `${text}-${random}`;
};

// toList
// "React, Node.js" or ["React", "Node.js"] → ["React", "Node.js"]
const toList = (value, separator = ",") => {
  if (!value) return [];
  if (Array.isArray(value))
    return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value)
    .split(separator)
    .map((v) => v.trim())
    .filter(Boolean);
};

// formatJob
// Turns a job from MongoDB into the shape JobCard / JobsDetails expect
// (the job must have .populate("company", "name initials photo address"))
const formatJob = (job) => ({
  id: job._id,
  slug: job.slug,
  title: job.title,
  company: job.company?.name || "Unknown company",
  companyId: job.company?._id,
  logoText: job.company?.initials || "?",
  logoUrl: job.company?.photo, // company logo from Cloudinary (if uploaded)
  type: job.type,
  level: job.level,
  experience: job.level,
  department: job.department,
  mode: job.mode,
  location: job.location || job.company?.address,
  salary: job.salary,
  salaryPeriod: job.salaryPeriod,
  skills: job.skills,
  about: job.about,
  requirements: job.requirements,
  benefits: job.benefits,
  ctaTitle: job.ctaTitle,
  deadline: job.deadline,
  status: job.status,
  postedAt: job.createdAt,
});

// statusLabel
// Application status in the database → the text the frontend badges show
const STATUS_LABELS = {
  pending: "Pending Review",
  shortlisted: "Shortlisted",
  exam: "Exam Scheduled",
  interview: "Interview Scheduled",
  approved: "Approved",
  rejected: "Rejected",
};
const statusLabel = (status) => STATUS_LABELS[status] || status;

// daysLeft
// deadline → 5  (0 when it has passed)
const daysLeft = (deadline) => {
  if (!deadline) return 0;
  const ms = new Date(deadline) - new Date();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
};

module.exports = {
  statusLabel,
  daysLeft,
  makeInitials,
  isStrongPassword,
  isValidEmail,
  generateOTP,
  generateAccessToken,
  makeSlug,
  toList,
  formatJob,
};
