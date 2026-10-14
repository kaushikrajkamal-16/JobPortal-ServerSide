const express = require("express");
const router = express.Router();
const applicantController = require("../../controllers/applicantController");
const authMiddleware = require("../../middleware/authMiddleware");
const roleMiddleware = require("../../middleware/roleMiddleware");
const { uploadResume } = require("../../middleware/upload");

// Every route here: must be logged in AND role "applicant"
router.use(authMiddleware, roleMiddleware("applicant"));

router.post(
  "/apply/:jobId",
  uploadResume.single("resume"),
  applicantController.ApplyJob,
); // POST   /api/v1/applicant/apply/:jobId  (form-data: resume)
router.get("/applications", applicantController.GetMyApplications); // GET    /api/v1/applicant/applications
router.delete(
  "/applications/withdraw/:id",
  applicantController.WithdrawApplication,
); // DELETE /api/v1/applicant/applications/withdraw/:id

module.exports = router;
