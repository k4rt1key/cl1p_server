const express = require("express");
const { searchCl1p, createCl1p, getPresignedUrls } = require("../controllers/cl1pController");
const router = express.Router();

router.post("/search", searchCl1p);
router.post("/create", createCl1p);
router.post("/upload", getPresignedUrls);

module.exports = router;
