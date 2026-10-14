const express = require("express");
const router = express.Router();
const companyController = require("../../controllers/companyController");
const authMiddleware = require("../../middleware/authMiddleware");
const roleMiddleware = require("../../middleware/roleMiddleware");

// Every route here: must be logged in AND role "company"
router.use(authMiddleware, roleMiddleware("company"));

// ---- Job posts ----
router.get("/jobs", companyController.GetMyJobs); // GET    /api/v1/company/jobs
router.post("/jobs/create", companyController.CreateJob); // POST   /api/v1/company/jobs/create
router.put("/jobs/update/:id", companyController.UpdateJob); // PUT    /api/v1/company/jobs/update/:id
router.patch("/jobs/pause/:id", companyController.TogglePauseJob); // PATCH  /api/v1/company/jobs/pause/:id
router.delete("/jobs/delete/:id", companyController.DeleteJob); // DELETE /api/v1/company/jobs/delete/:id

// ---- Candidates (applications to my jobs) ----
router.get("/candidates", companyController.GetCandidates); // GET    /api/v1/company/candidates?job=<jobId>
router.patch(
  "/candidates/status/:id",
  companyController.UpdateApplicationStatus,
); // PATCH  /api/v1/company/candidates/status/:id
router.delete("/candidates/delete/:id", companyController.DeleteCandidate); // DELETE /api/v1/company/candidates/delete/:id

module.exports = router;
