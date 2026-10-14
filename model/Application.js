const mongoose = require("mongoose");

// One row = one applicant applied to one job
// Used on: ApplyModal (create), ApplicantApplication (my list),
//          RecruiterDashboard "Candidates" table, AdminDashboard stats
const applicationSchema = new mongoose.Schema(
  {
    // [Auto] the job from the URL /applicant/apply/:jobId
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },

    // [Auto] the logged-in applicant
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // [Auto] the job's company (saved here so the company can find its candidates fast)
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // [ApplyModal] the uploaded CV → Cloudinary
    resume: { type: String, required: true }, // Cloudinary URL
    resumePublicId: String, // needed to delete the file later
    resumeType: { type: String, default: "image" }, // "image" (PDF) or "raw" (DOC/DOCX)
    resumeName: String, // "Rahim_Ahmed_CV_2026.pdf" (shown on ApplicantApplication)

    // [RecruiterDashboard] company changes it · [ApplicantApplication] badge
    status: {
      type: String,
      enum: ["pending", "shortlisted", "exam", "interview", "approved", "rejected"],
      default: "pending",
    },

    // [RecruiterDashboard] optional note · [ApplicantApplication] "Round 2: Technical Interview • Oct 28"
    interviewNote: String,

    // [Auto] every status change is saved here (timeline)
    statusHistory: [
      {
        status: String,
        changedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }, // createdAt = "Applied" date
);

// The same applicant can apply to the same job only ONCE
applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });

module.exports = mongoose.model("Application", applicationSchema);
