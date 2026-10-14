const mongoose = require("mongoose");
const jobSchema = require("../model/Job");
const userSchema = require("../model/User");
const { formatJob } = require("../utils/helpers");

// Company fields JobCard / JobsDetails need
const COMPANY_FIELDS = "name initials photo address";

// =============================================
// GET /jobs?page=1&limit=4&company=<id>   (Jobs page — no login, company is optional)
// =============================================
const GetJobs = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit) || 6);

    const filter = { status: "active" }; // only show open jobs

    // /jobs?company=<id> → only this company's jobs (Companies → "View Jobs")
    if (req.query.company && mongoose.isValidObjectId(req.query.company)) {
      filter.company = req.query.company;
    }

    const totalJobs = await jobSchema.countDocuments(filter);
    const jobs = await jobSchema
      .find(filter)
      .populate("company", COMPANY_FIELDS)
      .sort({ createdAt: -1 }) // newest first
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      success: true,
      jobs: jobs.map(formatJob),
      totalPages: Math.max(1, Math.ceil(totalJobs / limit)),
      totalJobs,
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
// GET /jobs/latest?limit=6   (Home "Latest Jobs" — no login)
// =============================================
const GetLatestJobs = async (req, res) => {
  try {
    const limit = Math.max(1, Number(req.query.limit) || 6);

    const jobs = await jobSchema
      .find({ status: "active" })
      .populate("company", COMPANY_FIELDS)
      .sort({ createdAt: -1 })
      .limit(limit);

    return res.status(200).json({
      success: true,
      jobs: jobs.map(formatJob),
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
// GET /jobs/:slug   (Job Details page — no login)
// =============================================
const GetJobBySlug = async (req, res) => {
  try {
    const job = await jobSchema
      .findOne({ slug: req.params.slug })
      .populate("company", COMPANY_FIELDS);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    return res.status(200).json({
      success: true,
      job: formatJob(job),
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
// GET /companies   (Companies page — no login)
// =============================================
const GetCompanies = async (req, res) => {
  try {
    const companies = await userSchema
      .find({ role: "company", isVerified: true })
      .select("name initials photo industry description address")
      .sort({ name: 1 }); // A → Z

    // Count open jobs for each company
    const result = await Promise.all(
      companies.map(async (company) => ({
        id: company._id,
        name: company.name,
        logo: company.initials,
        logoUrl: company.photo,
        industry: company.industry,
        description: company.description,
        location: company.address,
        openJobs: await jobSchema.countDocuments({
          company: company._id,
          status: "active",
        }),
      })),
    );

    return res.status(200).json({
      success: true,
      companies: result,
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
  GetJobs,
  GetLatestJobs,
  GetJobBySlug,
  GetCompanies,
};
