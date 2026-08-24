const express = require("express");
const router = express.Router();
const AboutContent = require("../models/AboutContent");
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");

// @route   GET /api/about
// @desc    Get about content (Singleton)
// @access  Public
router.get("/", async (req, res) => {
  try {
    let aboutContent = await AboutContent.findOne();
    if (!aboutContent) {
      // Create default if not exists
      aboutContent = new AboutContent({});
      await aboutContent.save();
    }

    if (
      !aboutContent.bannerTop &&
      !aboutContent.bannerBottom &&
      aboutContent.images.length > 0
    ) {
      const [first, second, ...rest] = aboutContent.images;
      aboutContent.bannerTop = first || "";
      aboutContent.bannerBottom = second || "";
      aboutContent.images = rest;
      await aboutContent.save();
    }

    res.json(aboutContent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/about
// @desc    Update about content (Singleton)
// @access  Private
router.put(
  "/",
  auth,
  upload.fields([
    { name: "bannerTop", maxCount: 1 },
    { name: "bannerBottom", maxCount: 1 },
    { name: "missionBg", maxCount: 1 },
    { name: "visionBg", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      let aboutContent = await AboutContent.findOne();
      if (!aboutContent) {
        aboutContent = new AboutContent({});
      }

      const { title, subtitle, history, missionPoints, visionContent } =
        req.body;

      if (title !== undefined) aboutContent.title = title;
      if (subtitle !== undefined) aboutContent.subtitle = subtitle;
      if (history !== undefined) aboutContent.history = history;
      if (visionContent !== undefined) {
        aboutContent.vision.content = visionContent;
        aboutContent.markModified("vision");
      }

      if (missionPoints) {
        // Expecting missionPoints to be JSON string of array if sent via FormData
        try {
          const parsedPoints = JSON.parse(missionPoints);
          if (Array.isArray(parsedPoints)) {
            aboutContent.mission.points = parsedPoints;
            aboutContent.markModified("mission");
          }
        } catch (e) {
          console.error("Error parsing mission points", e);
        }
      }

      // Handle Background Images
      if (req.files["missionBg"] && req.files["missionBg"][0]) {
        aboutContent.mission.backgroundImage = req.files["missionBg"][0].path;
        aboutContent.markModified("mission");
      }
      if (req.files["visionBg"] && req.files["visionBg"][0]) {
        aboutContent.vision.backgroundImage = req.files["visionBg"][0].path;
        aboutContent.markModified("vision");
      }

      if (req.files["bannerTop"] && req.files["bannerTop"][0]) {
        aboutContent.bannerTop = req.files["bannerTop"][0].path;
      } else if (
        req.body.keptBannerTop !== undefined &&
        req.body.keptBannerTop === ""
      ) {
        aboutContent.bannerTop = "";
      }

      if (req.files["bannerBottom"] && req.files["bannerBottom"][0]) {
        aboutContent.bannerBottom = req.files["bannerBottom"][0].path;
      } else if (
        req.body.keptBannerBottom !== undefined &&
        req.body.keptBannerBottom === ""
      ) {
        aboutContent.bannerBottom = "";
      }

      const saved = await aboutContent.save();
      res.json(aboutContent);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
);

module.exports = router;
