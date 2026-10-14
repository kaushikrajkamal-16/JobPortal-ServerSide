const express = require("express");
const router = express.Router();
const auth = require("./auth");
const applicant = require("./applicant");
const company = require("./company");
const admin = require("./admin");
const job = require("./job");

router.use("/auth", auth); // /api/v1/auth/...
router.use("/applicant", applicant); // /api/v1/applicant/...  (applicant only)
router.use("/company", company); // /api/v1/company/...    (company only)
router.use("/admin", admin); // /api/v1/admin/...      (admin only)
router.use("/", job); // /api/v1/jobs, /api/v1/companies  (public — keep LAST)

module.exports = router;
