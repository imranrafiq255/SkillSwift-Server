const DataUri = require("datauri/parser");
const path = require("path");
const fileUri = (file) => {
  try {
    const dataUri = new DataUri();
    const fileExtension = path.extname(file.originalname).toString();
    const buffer = dataUri.format(fileExtension, file.buffer);
    return buffer.content;
  } catch (error) {
    return error;
  }
};

module.exports = fileUri;
