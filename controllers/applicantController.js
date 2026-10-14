const mongoose = require("mongoose");
const jobSchema = require("../model/Job");
const applicationSchema = require("../model/Application");
const { statusLabel } = require("../utils/helpers");
const {
  uploadToCloudinary,
  deleteFromCloudinary,
} = require("../utils/uploadToCloudinary");

// =============================================
// POST /api/v1/applicant/apply/:jobId   (applicant only)
// Form-data (ApplyModal): resume = file (.pdf/.doc/.docx, max 5MB)
// =============================================
const ApplyJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    if (!mongoose.isValidObjectId(jobId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job id.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload your resume (PDF, DOC or DOCX).",
      });
    }

    const job = await jobSchema.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    if (job.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "This job is not taking applications right now.",
      });
    }

    if (job.deadline && new Date(job.deadline) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "The deadline for this job has passed.",
      });
    }

    // Already applied?
    const alreadyApplied = await applicationSchema.findOne({
      job: job._id,
      applicant: req.user._id,
    });

    if (alreadyApplied) {
      return res.status(409).json({
        success: false,
        message: "You have already applied to this job.",
      });
    }

    // Upload the CV to Cloudinary
    const uploaded = await uploadToCloudinary(req.file, "jobportal/resumes");

    const application = await applicationSchema.create({
      job: job._id,
      applicant: req.user._id,
      company: job.company,
      resume: uploaded.url,
      resumePublicId: uploaded.publicId,
      resumeType: uploaded.resourceType,
      resumeName: req.file.originalname,
      status: "pending",
      statusHistory: [{ status: "pending" }],
    });

    return res.status(201).json({
      success: true,
      message: "Application submitted successfully.",
      application,
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
// GET /api/v1/applicant/applications   (applicant only)
// Used on: ApplicantApplication page + ApplicantDashboard "recent applications"
// =============================================
const GetMyApplications = async (req, res) => {
  try {
    const applications = await applicationSchema
      .find({ applicant: req.user._id })
      .populate({
        path: "job",
        select: "title slug type mode location company",
        populate: { path: "company", select: "name initials photo address" },
      })
      .sort({ createdAt: -1 }); // newest first

    // Shape it like the cards on ApplicantApplication.jsx
    const result = applications.map((app) => ({
      id: app._id,
      jobId: app.job?._id,
      slug: app.job?.slug,
      title: app.job?.title || "Job removed",
      company: app.job?.company?.name || "Unknown company",
      companyLogo: app.job?.company?.photo,
      companyInitials: app.job?.company?.initials,
      location: app.job
        ? `${app.job.location || app.job.company?.address || ""}${app.job.mode ? ` (${app.job.mode})` : ""}`
        : "",
      type: app.job?.type,
      applied: app.createdAt,
      status: app.status, // "interview"
      statusLabel: statusLabel(app.status), // "Interview Scheduled"
      cv: app.resumeName,
      cvUrl: app.resume,
      interview: app.interviewNote,
      statusHistory: app.statusHistory,
    }));

    return res.status(200).json({
      success: true,
      total: result.length,
      applications: result,
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
// DELETE /api/v1/applicant/applications/withdraw/:id   (applicant only)
// "Withdraw" button on ApplicantApplication
// =============================================
const WithdrawApplication = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid application id.",
      });
    }

    // Only the applicant's OWN application
    const application = await applicationSchema.findOne({
      _id: id,
      applicant: req.user._id,
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found.",
      });
    }

    if (application.status === "approved") {
      return res.status(400).json({
        success: false,
        message: "You can't withdraw an approved application.",
      });
    }

    await deleteFromCloudinary(
      application.resumePublicId,
      application.resumeType,
    );
    await application.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Application withdrawn.",
      deletedApplicationId: application._id,
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
  ApplyJob,
  GetMyApplications,
  WithdrawApplication,
};
