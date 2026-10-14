const mongoose = require("mongoose");

// Where each field is used:
//   [PostJobModal]   = the company types it in the "Post a Job" popup
//   [JobCard]        = shown on the small job card (Jobs page, Home "Latest Jobs")
//   [JobsDetails]    = shown on the full Job Details page
//   [Auto]           = the backend fills it in, nobody types it

const jobSchema = new mongoose.Schema(
  {
    // [Auto] the logged-in company · [JobCard] company name + logo · [JobsDetails]
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // [PostJobModal] "Job Title" (required) · [JobCard] · [JobsDetails]
    title: { type: String, required: true, trim: true },

    // [Auto] from title + company name · [JobCard] link /jobs/:slug
    slug: { type: String, unique: true },

    // [PostJobModal] "Division" (sent as "division") · [JobsDetails] "Department"
    department: String,

    // [PostJobModal] "Type" · [JobCard] badge · [JobsDetails]
    type: String,

    // [PostJobModal] "Mode" (On-site / Hybrid / Remote)
    mode: String,

    // [Optional] empty → company address · [JobCard] · [JobsDetails]
    location: String,

    // [Optional] e.g. "Graduate Hire" · [JobCard] · [JobsDetails] "Experience"
    level: String,

    // [PostJobModal] "Salary" (required) · [JobCard] · [JobsDetails]
    salary: String,

    // [Optional] default "month" · [JobCard] "/ month" · [JobsDetails]
    salaryPeriod: { type: String, default: "month" },

    // [PostJobModal] "Deadline" (required, future date) · [JobsDetails]
    deadline: Date,

    // [PostJobModal] "Description" (sent as "description") · [JobsDetails] "About"
    about: String,

    // [PostJobModal] "Skills" ("React, Node.js") · [JobCard] tags
    skills: [String],

    // [Optional] · [JobsDetails] "Requirements" list
    requirements: [String],

    // [Optional] · [JobsDetails] "Benefits" list
    benefits: [String],

    // [Optional] · [JobsDetails] bottom title
    ctaTitle: String,

    // [Auto] "active" · only active jobs are shown on [JobCard]
    status: {
      type: String,
      enum: ["active", "paused", "closed"],
      default: "active",
    },

    // [Auto] the admin who reviewed it (Manage Job Posts)
    moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }, // [Auto] createdAt = "Posted" date · [JobCard]
);

module.exports = mongoose.model("Job", jobSchema);
