const multer = require("multer");

const singleImageUpload = (fieldName) => {
  const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, callback) => {
      if (file.mimetype.startsWith("image/")) {
        callback(null, true);
      } else {
        callback(new Error("Only image files are allowed"), false);
      }
    },
  }).single(fieldName);
  return upload;
};

module.exports = singleImageUpload;
