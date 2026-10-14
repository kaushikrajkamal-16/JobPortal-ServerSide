const express = require("express");
const router = express.Router();
const adminController = require("../../controllers/adminController");
const authMiddleware = require("../../middleware/authMiddleware");
const roleMiddleware = require("../../middleware/roleMiddleware");

// Every route here: must be logged in AND role "admin"
router.use(authMiddleware, roleMiddleware("admin"));

// ---- AdminDashboard ----
router.get("/stats", adminController.GetStats); // GET    /api/v1/admin/stats
router.get("/users", adminController.GetUsers); // GET    /api/v1/admin/users?page=1&limit=3&role=applicant

// ---- ManageApplicants ----
router.get("/applicants", adminController.GetApplicants); // GET    /api/v1/admin/applicants?search=&page=1&limit=3
router.post("/applicants/add", adminController.AddApplicant); // POST   /api/v1/admin/applicants/add
router.patch("/applicants/flag/:id", adminController.ToggleFlagApplicant); // PATCH  /api/v1/admin/applicants/flag/:id
router.delete("/applicants/delete/:id", adminController.DeleteApplicant); // DELETE /api/v1/admin/applicants/delete/:id

// ---- ManageCompanies ----
router.get("/companies", adminController.GetCompanies); // GET    /api/v1/admin/companies?search=&industry=&page=1&limit=3
router.post("/companies/add", adminController.AddCompany); // POST   /api/v1/admin/companies/add
router.delete("/companies/delete/:id", adminController.DeleteCompany); // DELETE /api/v1/admin/companies/delete/:id

// ---- ManageJobPosts ----
router.get("/jobs", adminController.GetAllJobs); // GET    /api/v1/admin/jobs?status=&page=1&limit=3
router.patch("/jobs/close/:id", adminController.CloseJob); // PATCH  /api/v1/admin/jobs/close/:id
router.delete("/jobs/delete/:id", adminController.DeleteJob); // DELETE /api/v1/admin/jobs/delete/:id

module.exports = router;
