require("node:dns").setServers(["8.8.8.8", "1.1.1.1"]);
require("dotenv").config();
const cookieParser = require("cookie-parser");
const cors = require("cors");
const express = require("express");
const app = express();
const dbConfig = require("./configuration/dbConnection");
const cloudinaryconfig = require("./configuration/cloudinary");
const router = require("./routes");

// Let the React app (Vite, port 5173) call this server and send the cookie
const allowedOrigin = (
  process.env.CLIENT_URL || "http://localhost:5173"
).replace(/\/+$/, "");
app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());
dbConfig();

app.use(router);

// Error handler (must be LAST)
// Catches multer errors like "File too large" or "Only PDF, DOC or DOCX files are allowed."
app.use((err, req, res, next) => {
  console.log(err.message);
  const message =
    err.code === "LIMIT_FILE_SIZE"
      ? "File is too large. Max size is 5MB."
      : err.message || "Something went wrong.";
  return res.status(400).json({ success: false, message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
