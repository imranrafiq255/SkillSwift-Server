const multer = require("multer");

const twoImagesUpload = (fieldName) => {
  const storage = multer.memoryStorage();
  const fileFilter = (req, file, callback) => {
    if (file.mimetype.startsWith("image/")) {
      callback(null, true);
    } else {
      callback(new Error("Only image files are allowed"), false);
    }
  };

  const upload = multer({ storage, fileFilter }).array(fieldName, 2);

  return upload;
};

module.exports = twoImagesUpload;
