const mongoose = require("mongoose");
const userSchema = require("../model/User");
const jobSchema = require("../model/Job");
const applicationSchema = require("../model/Application");
const {
  makeInitials,
  isValidEmail,
  isStrongPassword,
  daysLeft,
} = require("../utils/helpers");
const { deleteFromCloudinary } = require("../utils/uploadToCloudinary");

// ---------- small helpers (only used in this file) ----------

// ?page=2&limit=3 → { page: 2, limit: 3, skip: 3 }
const getPage = (query, defaultLimit = 10) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Number(query.limit) || defaultLimit);
  return { page, limit, skip: (page - 1) * limit };
};

// Search text → safe regex ("c++" won't break it)
const searchRegex = (text) =>
  new RegExp(String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

// Delete applications + their CV files
const deleteApplications = async (filter) => {
  const applications = await applicationSchema.find(filter);
  for (const app of applications) {
    await deleteFromCloudinary(app.resumePublicId, app.resumeType);
  }
  await applicationSchema.deleteMany(filter);
};

// Same checks for "Add Applicant" and "Add Company"
const checkNewUser = async (email, password) => {
  if (!email || !password) return "Email and password are required.";
  if (!isValidEmail(email)) return "Email is not valid.";
  if (!isStrongPassword(password))
    return "Password needs an uppercase letter, a lowercase letter, a number and a symbol (e.g. Rahim@123).";
  const exists = await userSchema.findOne({ email });
  if (exists) return "An account with this email already exists.";
  return null; // all good
};

const roleLabel = { applicant: "Applicant", company: "Recruiter", admin: "Admin" };

// =============================================
// GET /api/v1/admin/stats   (AdminDashboard cards)
// =============================================
const GetStats = async (req, res) => {
  try {
    const [
      totalApplicants,
      totalCompanies,
      totalJobs,
      activeJobs,
      totalApplications,
      totalHired,
    ] = await Promise.all([
      userSchema.countDocuments({ role: "applicant" }),
      userSchema.countDocuments({ role: "company" }),
      jobSchema.countDocuments(),
      jobSchema.countDocuments({ status: "active" }),
      applicationSchema.countDocuments(),
      applicationSchema.countDocuments({ status: "approved" }),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalApplicants,
        totalCompanies,
        totalJobs,
        activeJobs,
        totalApplications,
        totalHired,
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

// =============================================
// GET /api/v1/admin/users?page=1&limit=3&role=applicant
// AdminDashboard "Recent users" table (newest first). role is optional.
// =============================================
const GetUsers = async (req, res) => {
  try {
    const { page, limit, skip } = getPage(req.query, 10);
    const filter = {};
    if (["applicant", "company", "admin"].includes(req.query.role)) {
      filter.role = req.query.role;
    }

    const totalUsers = await userSchema.countDocuments(filter);
    const users = await userSchema
      .find(filter)
      .select("name initials email role department industry office photo createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      users: users.map((u) => ({
        id: u._id,
        initials: u.initials,
        name: u.name,
        email: u.email,
        photo: u.photo,
        role: roleLabel[u.role], // "Applicant" / "Recruiter" / "Admin"
        org: u.department || u.industry || u.office || "—",
        joined: u.createdAt,
      })),
      totalPages: Math.max(1, Math.ceil(totalUsers / limit)),
      totalUsers,
      page,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

// =============================================
// GET /api/v1/admin/applicants?search=rahim&page=1&limit=3   (ManageApplicants)
// =============================================
const GetApplicants = async (req, res) => {
  try {
    const { page, limit, skip } = getPage(req.query, 10);
    const filter = { role: "applicant" };

    if (req.query.search) {
      const rx = searchRegex(req.query.search);
      filter.$or = [{ name: rx }, { email: rx }, { department: rx }];
    }

    const totalApplicants = await userSchema.countDocuments(filter);
    const applicants = await userSchema
      .find(filter)
      .select("name initials email phone photo department batch isFlagged isVerified createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      applicants: applicants.map((a) => ({
        id: a._id,
        initials: a.initials,
        name: a.name,
        email: a.email,
        phone: a.phone,
        photo: a.photo,
        dept: a.department || "—",
        batch: a.batch || "—",
        flagged: a.isFlagged,
        isVerified: a.isVerified,
        joined: a.createdAt,
      })),
      totalPages: Math.max(1, Math.ceil(totalApplicants / limit)),
      totalApplicants,
      page,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

// =============================================
// POST /api/v1/admin/applicants/add   (AddApplicantModal)
// Body: { email, password, name?, department?, batch? }
// No OTP needed — the admin made it, so it is already verified
// =============================================
const AddApplicant = async (req, res) => {
  try {
    const email = (req.body.email || "").toLowerCase().trim();
    const { password, department, batch } = req.body;

    const problem = await checkNewUser(email, password);
    if (problem) {
      return res.status(400).json({ success: false, message: problem });
    }

    // No name in the modal → "rahim@gmail.com" → "rahim"
    const name = (req.body.name || email.split("@")[0]).trim();

    const user = await userSchema.create({
      name,
      initials: makeInitials(name),
      email,
      password, // hashed automatically (pre "save")
      role: "applicant",
      isVerified: true,
      department,
      batch,
      addedBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Applicant added successfully.",
      applicant: {
        id: user._id,
        initials: user.initials,
        name: user.name,
        email: user.email,
        dept: user.department || "—",
        batch: user.batch || "—",
        flagged: user.isFlagged,
        joined: user.createdAt,
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

// =============================================
// PATCH /api/v1/admin/applicants/flag/:id   (ManageApplicants red "flagged" mark)
// No body — flagged → not flagged, not flagged → flagged
// =============================================
const ToggleFlagApplicant = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid user id." });
    }

    const user = await userSchema.findOne({ _id: id, role: "applicant" });

    if (!user) {
      return res.status(404).json({ success: false, message: "Applicant not found." });
    }

    user.isFlagged = !user.isFlagged;
    await user.save();

    return res.status(200).json({
      success: true,
      message: user.isFlagged ? "Applicant flagged." : "Flag removed.",
      flagged: user.isFlagged,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

// =============================================
// DELETE /api/v1/admin/applicants/delete/:id   (ManageApplicants trash button)
// Also deletes the applicant's applications, CVs and photo
// =============================================
const DeleteApplicant = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid user id." });
    }

    const user = await userSchema.findOneAndDelete({ _id: id, role: "applicant" });

    if (!user) {
      return res.status(404).json({ success: false, message: "Applicant not found." });
    }

    await deleteApplications({ applicant: user._id });
    await deleteFromCloudinary(user.photoPublicId);

    return res.status(200).json({
      success: true,
      message: "Applicant deleted successfully.",
      deletedUserId: user._id,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

// =============================================
// GET /api/v1/admin/companies?search=brain&industry=FinTech&page=1&limit=3   (ManageCompanies)
// =============================================
const GetCompanies = async (req, res) => {
  try {
    const { page, limit, skip } = getPage(req.query, 10);
    const filter = { role: "company" };

    if (req.query.search) filter.name = searchRegex(req.query.search);
    if (req.query.industry) filter.industry = req.query.industry;

    const totalCompanies = await userSchema.countDocuments(filter);
    const companies = await userSchema
      .find(filter)
      .select("name initials email phone photo industry address website isVerified createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const result = await Promise.all(
      companies.map(async (c) => ({
        id: c._id,
        logo: c.initials,
        logoUrl: c.photo,
        name: c.name,
        industry: c.industry || "Not set yet",
        email: c.email,
        phone: c.phone,
        address: c.address,
        website: c.website,
        isVerified: c.isVerified,
        jobs: await jobSchema.countDocuments({ company: c._id }),
        joined: c.createdAt,
      })),
    );

    // All industries for the filter dropdown
    const industries = await userSchema.distinct("industry", {
      role: "company",
      industry: { $nin: [null, ""] },
    });

    return res.status(200).json({
      success: true,
      companies: result,
      industries,
      totalPages: Math.max(1, Math.ceil(totalCompanies / limit)),
      totalCompanies,
      page,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

// =============================================
// POST /api/v1/admin/companies/add   (AddCompanyModal)
// Body: { name, email, password, industry? }
// =============================================
const AddCompany = async (req, res) => {
  try {
    const name = (req.body.name || "").trim();
    const email = (req.body.email || "").toLowerCase().trim();
    const { password, industry } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "Company name is required." });
    }

    const problem = await checkNewUser(email, password);
    if (problem) {
      return res.status(400).json({ success: false, message: problem });
    }

    const user = await userSchema.create({
      name,
      initials: makeInitials(name),
      email,
      password, // hashed automatically (pre "save")
      role: "company",
      isVerified: true,
      industry,
      addedBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Company added successfully.",
      company: {
        id: user._id,
        logo: user.initials,
        name: user.name,
        industry: user.industry || "Not set yet",
        email: user.email,
        jobs: 0,
        joined: user.createdAt,
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

// =============================================
// DELETE /api/v1/admin/companies/delete/:id   (ManageCompanies "Delete")
// Also deletes the company's jobs, the applications to them, and its logo
// =============================================
const DeleteCompany = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid user id." });
    }

    const company = await userSchema.findOneAndDelete({ _id: id, role: "company" });

    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found." });
    }

    await deleteApplications({ company: company._id });
    await jobSchema.deleteMany({ company: company._id });
    await deleteFromCloudinary(company.photoPublicId);

    return res.status(200).json({
      success: true,
      message: "Company and its jobs deleted successfully.",
      deletedUserId: company._id,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

// =============================================
// GET /api/v1/admin/jobs?status=active&page=1&limit=3   (ManageJobPosts)
// Shows ALL jobs (active, paused, closed). status is optional.
// =============================================
const GetAllJobs = async (req, res) => {
  try {
    const { page, limit, skip } = getPage(req.query, 10);
    const filter = {};
    if (["active", "paused", "closed"].includes(req.query.status)) {
      filter.status = req.query.status;
    }

    const totalJobs = await jobSchema.countDocuments(filter);
    const jobs = await jobSchema
      .find(filter)
      .populate("company", "name initials photo")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      jobs: jobs.map((job) => {
        const left = daysLeft(job.deadline);
        const closed = job.status === "closed" || left === 0;
        return {
          id: job._id,
          slug: job.slug,
          title: job.title,
          type: job.type,
          dept: job.department,
          company: job.company?.name || "Deleted company",
          companyLogo: job.company?.photo,
          posted: job.createdAt,
          deadline: job.deadline,
          status: job.status,
          daysLeft: left,
          left: closed ? "Closed" : `${left} days left`,
          urgent: !closed && left <= 7, // red text
          closed, // faded row
        };
      }),
      totalPages: Math.max(1, Math.ceil(totalJobs / limit)),
      totalJobs,
      page,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

// =============================================
// PATCH /api/v1/admin/jobs/close/:id   (ManageJobPosts "Close" button)
// No body. Sets status "closed" and remembers which admin did it.
// =============================================
const CloseJob = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid job id." });
    }

    const job = await jobSchema.findByIdAndUpdate(
      id,
      { status: "closed", moderatedBy: req.user._id },
      { returnDocument: "after" }, // give back the UPDATED job
    );

    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Job closed.",
      job: { id: job._id, status: job.status, moderatedBy: job.moderatedBy },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

// =============================================
// DELETE /api/v1/admin/jobs/delete/:id   (ManageJobPosts trash button)
// Any company's job + its applications
// =============================================
const DeleteJob = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid job id." });
    }

    const job = await jobSchema.findByIdAndDelete(id);

    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found." });
    }

    await deleteApplications({ job: job._id });

    return res.status(200).json({
      success: true,
      message: "Job deleted successfully.",
      deletedJobId: job._id,
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
  GetStats,
  GetUsers,
  GetApplicants,
  AddApplicant,
  ToggleFlagApplicant,
  DeleteApplicant,
  GetCompanies,
  AddCompany,
  DeleteCompany,
  GetAllJobs,
  CloseJob,
  DeleteJob,
};
