const cloudinary = require("../configuration/cloudinary");

// Sends a file (from multer memory) to Cloudinary
// folder: "jobportal/photos", "jobportal/logos" or "jobportal/resumes"
// Gives back: { url, publicId, resourceType }
const uploadToCloudinary = (file, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto", // images and PDF/DOC files
        use_filename: true, // keep the original name, e.g. Rahim_CV.pdf
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type, // "image" (photos, PDF) or "raw" (DOC/DOCX)
        });
      },
    );
    stream.end(file.buffer);
  });
};

// Deletes an old file from Cloudinary (e.g. old photo, or a withdrawn resume)
// resourceType: "image" (default) or "raw" for DOC/DOCX files
const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error) {
    // Don't stop the request just because an old file couldn't be removed
    console.log("Cloudinary delete failed:", error.message);
  }
};

module.exports = { uploadToCloudinary, deleteFromCloudinary };
