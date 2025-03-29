const mongoose = require("mongoose");

const FileSchema = new mongoose.Schema({
  fileId: { type: String, required: true },
  fileName: { type: String, required: true },
  fileUrl: { type: String, required: true },
  sharedWith: [{ email: String, role: String }], // Stores users the doc is shared with
  createdAt: { type: Date, default: Date.now },
});

const UserSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  profilePic: { type: String },
  accessToken: { type: String },
  refreshToken: { type: String },
  files: [FileSchema], // Stores the Google Docs created by the user
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", UserSchema);
