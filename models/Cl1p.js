const mongoose = require("mongoose");

const Cl1pSchema = new mongoose.Schema({
  name: { type: String, unique: true, required: true },
  text: { type: String },
  files: [{
    fileName : String,
    fileKey: { type: String, required: true },
    contentType: String,
    size: { type: Number, required: true }
  }],
  password: { type: String, select: false },
  expiry: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Cl1p", Cl1pSchema);
