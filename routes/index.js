const express = require("express");
const router = express.Router();
const apiRoute = require("./api");

const api = process.env.BASE_URL;

router.use(api, apiRoute);

router.use(api, (req, res) =>
  res
    .status(404)
    .json({ success: false, message: "No Api Found On This Route Location" }),
);

// Export the router so other files can use it
module.exports = router;
