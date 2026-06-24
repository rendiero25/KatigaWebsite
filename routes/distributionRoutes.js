const express = require("express");
const router = express.Router();
const DistributionChannel = require("../models/DistributionChannel");
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");

// @route   GET /api/distribution
// @desc    Get distribution channel content
// @access  Public
router.get("/", async (req, res) => {
  try {
    let content = await DistributionChannel.findOne();
    res.json(content || {});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/distribution
// @desc    Update distribution channel content
// @access  Private
router.put("/", auth, upload.single("mapImage"), async (req, res) => {
  console.log("PUT /api/distribution Body:", req.body);
  console.log("PUT /api/distribution File:", req.file);
  try {
    let content = await DistributionChannel.findOne();

    const { title, description } = req.body;

    if (!content) {
      content = new DistributionChannel({
        title: title || "",
        description: description || "",
        mapImage: req.file ? req.file.path : "",
      });
    } else {
      if (title) content.title = title;
      if (description) content.description = description;
      if (req.file) content.mapImage = req.file.path;
    }

    await content.save();
    res.json(content);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
