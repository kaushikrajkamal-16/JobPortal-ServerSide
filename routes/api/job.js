const express = require("express");
const router = express.Router();
const jobController = require("../../controllers/jobController");

// No login needed
router.get("/jobs", jobController.GetJobs); // GET /jobs?page=1&limit=4
router.get("/jobs/latest", jobController.GetLatestJobs); // GET /jobs/latest (must be BEFORE /jobs/:slug)
router.get("/jobs/:slug", jobController.GetJobBySlug); // GET /jobs/<slug>
router.get("/companies", jobController.GetCompanies); // GET /companies

module.exports = router;
