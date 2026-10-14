const multer = require("multer");

// Keep the file in memory (not on disk) — we send it straight to Cloudinary
const storage = multer.memoryStorage();

// Only images: for profile photo and company logo
const uploadImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB (same as EditProfileModal)
  fileFilter: (req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only PNG, JPG or WebP images are allowed."));
  },
});

// Only resumes: for ApplyModal (.pdf, .doc, .docx)
const uploadResume = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB (same as ApplyModal)
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only PDF, DOC or DOCX files are allowed."));
  },
});

module.exports = { uploadImage, uploadResume };
