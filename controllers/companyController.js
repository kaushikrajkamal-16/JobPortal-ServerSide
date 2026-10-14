const mongoose = require("mongoose");
const jobSchema = require("../model/Job");
const applicationSchema = require("../model/Application");
const {
  makeSlug,
  toList,
  daysLeft,
  statusLabel,
} = require("../utils/helpers");
const { deleteFromCloudinary } = require("../utils/uploadToCloudinary");

// =============================================
// POST /api/v1/company/jobs/create   (company only)
// Body (PostJobModal): { title, division, type, mode, salary, deadline, description, skills }
// =============================================
const CreateJob = async (req, res) => {
  try {
    const {
      title,
      type,
      mode,
      salary,
      deadline,
      location,
      level,
      salaryPeriod,
      ctaTitle,
    } = req.body;

    if (!title || !salary || !deadline) {
      return res.status(400).json({
        success: false,
        message: "Job title, salary and deadline are required.",
      });
    }

    if (isNaN(new Date(deadline)) || new Date(deadline) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Deadline must be a valid future date (YYYY-MM-DD).",
      });
    }

    // req.user = the logged-in company (from authMiddleware)
    const company = req.user;

    const job = await jobSchema.create({
      company: company._id,
      title: title.trim(),
      slug: makeSlug(title, company.name),
      department: req.body.department || req.body.division, // PostJobModal calls it "division"
      type,
      mode,
      location: location || company.address,
      level,
      salary,
      salaryPeriod,
      deadline,
      about: req.body.about || req.body.description, // PostJobModal calls it "description"
      skills: toList(req.body.skills), // "React, Node.js" → ["React", "Node.js"]
      requirements: toList(req.body.requirements, "\n"), // array, or one per line
      benefits: toList(req.body.benefits, "\n"), // array, or one per line
      ctaTitle,
    });

    return res.status(201).json({
      success: true,
      message: "Job posted successfully.",
      job,
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
// PUT /api/v1/company/jobs/update/:id   (company only — can only edit its OWN jobs)
// Body: any of the job fields below (send only what you want to change)
// =============================================
const UpdateJob = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job id.",
      });
    }

    // Find the job AND make sure it belongs to this company
    const job = await jobSchema.findOne({ _id: id, company: req.user._id });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    const body = req.body;
    const oldTitle = job.title; // remember it, to know if the title changed

    // ---- Simple text fields ----
    const textFields = [
      "title",
      "type",
      "mode",
      "location",
      "level",
      "salary",
      "salaryPeriod",
      "ctaTitle",
    ];
    textFields.forEach((field) => {
      if (body[field] !== undefined) job[field] = String(body[field]).trim();
    });

    if (body.title !== undefined && !job.title) {
      return res.status(400).json({
        success: false,
        message: "Job title cannot be empty.",
      });
    }

    // ---- Title changed → make a new slug ----
    // "Frontend Developer" → "Senior Frontend Developer"
    // slug: "frontend-developer-techsoft-ltd-k3x9" → "senior-frontend-developer-techsoft-ltd-p7m2"
    if (job.title !== oldTitle) {
      job.slug = makeSlug(job.title, req.user.name);
    }

    // ---- PostJobModal names → schema names ----
    if (body.division !== undefined || body.department !== undefined) {
      job.department = body.department ?? body.division;
    }
    if (body.description !== undefined || body.about !== undefined) {
      job.about = body.about ?? body.description;
    }

    // ---- Lists ----
    if (body.skills !== undefined) job.skills = toList(body.skills);
    if (body.requirements !== undefined)
      job.requirements = toList(body.requirements, "\n");
    if (body.benefits !== undefined) job.benefits = toList(body.benefits, "\n");

    // ---- Deadline ----
    if (body.deadline !== undefined) {
      if (
        isNaN(new Date(body.deadline)) ||
        new Date(body.deadline) < new Date()
      ) {
        return res.status(400).json({
          success: false,
          message: "Deadline must be a valid future date (YYYY-MM-DD).",
        });
      }
      job.deadline = body.deadline;
    }

    // ---- Status: company can only pause or re-open (admin closes) ----
    if (body.status !== undefined) {
      if (!["active", "paused"].includes(body.status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be active or paused.",
        });
      }
      job.status = body.status;
    }

    await job.save();

    return res.status(200).json({
      success: true,
      message: "Job updated successfully.",
      job,
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
// DELETE /api/v1/company/jobs/delete/:id   (company only — can only delete its OWN jobs)
// =============================================
const DeleteJob = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job id.",
      });
    }

    // Delete only if the job belongs to this company
    const job = await jobSchema.findOneAndDelete({
      _id: id,
      company: req.user._id,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    // Also delete this job's applications (and their CV files)
    const applications = await applicationSchema.find({ job: job._id });
    for (const app of applications) {
      await deleteFromCloudinary(app.resumePublicId, app.resumeType);
    }
    await applicationSchema.deleteMany({ job: job._id });

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

// =============================================
// GET /api/v1/company/jobs   (company only)
// RecruiterDashboard "My Job Posts" table
// =============================================
const GetMyJobs = async (req, res) => {
  try {
    const jobs = await jobSchema
      .find({ company: req.user._id })
      .sort({ createdAt: -1 });

    // Add "applicants" and "hired" counts to every job
    const result = await Promise.all(
      jobs.map(async (job) => ({
        id: job._id,
        slug: job.slug,
        short: job.title.slice(0, 2).toUpperCase(), // "Full Stack" → "FU" (icon box)
        title: job.title,
        division: job.department,
        type: job.type,
        mode: job.mode,
        location: job.location,
        level: job.level,
        salary: job.salary,
        salaryPeriod: job.salaryPeriod,
        deadline: job.deadline,
        about: job.about,
        skills: job.skills,
        requirements: job.requirements,
        benefits: job.benefits,
        ctaTitle: job.ctaTitle,
        daysLeft: daysLeft(job.deadline),
        closes: job.deadline,
        status: job.status,
        paused: job.status === "paused",
        postedAt: job.createdAt,
        applicants: await applicationSchema.countDocuments({ job: job._id }),
        hired: await applicationSchema.countDocuments({
          job: job._id,
          status: "approved",
        }),
      })),
    );

    return res.status(200).json({
      success: true,
      total: result.length,
      jobs: result,
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
// PATCH /api/v1/company/jobs/pause/:id   (company only)
// RecruiterDashboard "Pause / Resume" button — no body needed
// active → paused,  paused → active
// =============================================
const TogglePauseJob = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job id.",
      });
    }

    const job = await jobSchema.findOne({ _id: id, company: req.user._id });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    if (job.status === "closed") {
      return res.status(400).json({
        success: false,
        message: "This job was closed by the admin.",
      });
    }

    job.status = job.status === "active" ? "paused" : "active";
    await job.save();

    return res.status(200).json({
      success: true,
      message: job.status === "paused" ? "Job paused." : "Job is active again.",
      status: job.status,
      paused: job.status === "paused",
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
// GET /api/v1/company/candidates            (all candidates)
// GET /api/v1/company/candidates?job=<jobId> (only one job — the filter dropdown)
// RecruiterDashboard "Candidates" table
// =============================================
const GetCandidates = async (req, res) => {
  try {
    const filter = { company: req.user._id };

    if (req.query.job && req.query.job !== "all") {
      if (!mongoose.isValidObjectId(req.query.job)) {
        return res.status(400).json({
          success: false,
          message: "Invalid job id.",
        });
      }
      filter.job = req.query.job;
    }

    const applications = await applicationSchema
      .find(filter)
      .populate("applicant", "name initials email phone photo department batch")
      .populate("job", "title")
      .sort({ createdAt: -1 });

    const candidates = applications.map((app) => ({
      id: app._id, // application id (use it for status / delete)
      applicantId: app.applicant?._id,
      initials: app.applicant?.initials,
      name: app.applicant?.name || "Deleted user",
      email: app.applicant?.email,
      phone: app.applicant?.phone,
      photo: app.applicant?.photo,
      department: app.applicant?.department,
      batch: app.applicant?.batch,
      jobId: app.job?._id,
      job: app.job?.title || "Job removed",
      resume: app.resume,
      resumeName: app.resumeName,
      status: app.status, // "pending"
      statusLabel: statusLabel(app.status), // "Pending Review"
      interviewNote: app.interviewNote,
      appliedAt: app.createdAt,
    }));

    return res.status(200).json({
      success: true,
      total: candidates.length,
      candidates,
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
// PATCH /api/v1/company/candidates/status/:id   (company only)  :id = application id
// Body: { status, interviewNote }
// status = pending | shortlisted | exam | interview | approved | rejected
// =============================================
const UpdateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, interviewNote } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid application id.",
      });
    }

    const allowed = [
      "pending",
      "shortlisted",
      "exam",
      "interview",
      "approved",
      "rejected",
    ];

    // The frontend may send "Approved" — make it "approved"
    const newStatus = String(status || "").toLowerCase().trim();

    if (!allowed.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${allowed.join(", ")}.`,
      });
    }

    // Only applications for THIS company's jobs
    const application = await applicationSchema.findOne({
      _id: id,
      company: req.user._id,
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found.",
      });
    }

    if (application.status !== newStatus) {
      application.status = newStatus;
      application.statusHistory.push({ status: newStatus });
    }
    if (interviewNote !== undefined) {
      application.interviewNote = String(interviewNote).trim();
    }
    await application.save();

    return res.status(200).json({
      success: true,
      message: `Status changed to ${statusLabel(newStatus)}.`,
      application: {
        id: application._id,
        status: application.status,
        statusLabel: statusLabel(application.status),
        interviewNote: application.interviewNote,
        statusHistory: application.statusHistory,
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
// DELETE /api/v1/company/candidates/delete/:id   (company only)  :id = application id
// RecruiterDashboard "Delete" (trash) button on a candidate row
// =============================================
const DeleteCandidate = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid application id.",
      });
    }

    const application = await applicationSchema.findOneAndDelete({
      _id: id,
      company: req.user._id,
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found.",
      });
    }

    await deleteFromCloudinary(
      application.resumePublicId,
      application.resumeType,
    );

    return res.status(200).json({
      success: true,
      message: "Candidate removed.",
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
  CreateJob,
  UpdateJob,
  DeleteJob,
  GetMyJobs,
  TogglePauseJob,
  GetCandidates,
  UpdateApplicationStatus,
  DeleteCandidate,
};
