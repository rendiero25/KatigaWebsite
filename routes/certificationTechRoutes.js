const express = require("express");
const router = express.Router();
const CertificationTechnology = require("../models/CertificationTechnology");
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");

// @route   GET /api/certification-tech
// @desc    Get certification technology content
// @access  Public
router.get("/", async (req, res) => {
  try {
    let content = await CertificationTechnology.findOne();
    res.json(content || {});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/certification-tech
// @desc    Update certification technology content
// @access  Private
router.put(
  "/",
  auth,
  upload.fields([
    { name: "section1Image", maxCount: 1 },
    { name: "section2Image", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      let content = await CertificationTechnology.findOne();
      if (!content) content = new CertificationTechnology({});

      const {
        headerTitle,
        headerSubtitle,
        sec1Title,
        sec1Points,
        sec2Title,
        sec2Subtitle,
        sec2Points,
      } = req.body;

      // Header
      if (headerTitle !== undefined) content.header.title = headerTitle;
      if (headerSubtitle !== undefined)
        content.header.subtitle = headerSubtitle;

      // Section 1 (Certificates)
      if (sec1Title !== undefined) content.section1.title = sec1Title;
      if (sec1Points) {
        try {
          content.section1.points = JSON.parse(sec1Points);
        } catch (e) {
          console.error("Error parsing sec1Points", e);
        }
      }
      if (req.files["section1Image"] && req.files["section1Image"][0]) {
        content.section1.image = `/uploads/${req.files["section1Image"][0].filename}`;
      }

      // Section 2 (Forest/Fashion)
      if (sec2Title !== undefined) content.section2.title = sec2Title;
      if (sec2Subtitle !== undefined) content.section2.subtitle = sec2Subtitle;
      if (sec2Points) {
        try {
          content.section2.points = JSON.parse(sec2Points);
        } catch (e) {
          console.error("Error parsing sec2Points", e);
        }
      }
      if (req.files["section2Image"] && req.files["section2Image"][0]) {
        content.section2.image = `/uploads/${req.files["section2Image"][0].filename}`;
      }

      await content.save();
      res.json(content);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
);

module.exports = router;
