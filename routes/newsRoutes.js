const express = require("express");
const router = express.Router();
const NewsArticle = require("../models/NewsArticle");
const NewsSection = require("../models/NewsSection");
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");

// @route   GET /api/news/content
// @desc    Get news section content
// @access  Public
router.get("/content", async (req, res) => {
  try {
    let content = await NewsSection.findOne();
    if (!content) {
      content = new NewsSection();
      await content.save();
    }
    res.json(content);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/news/content
// @desc    Update news section content
// @access  Private
router.put("/content", auth, upload.single("bannerImage"), async (req, res) => {
  try {
    let content = await NewsSection.findOne();
    if (!content) {
      content = new NewsSection();
    }

    const { title, subtitle } = req.body;
    if (title) content.title = title;
    if (subtitle) content.subtitle = subtitle;
    if (req.file) content.bannerImage = req.file.path;

    await content.save();
    res.json(content);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/news
// @desc    Get all news articles with pagination, search, and filtering
// @access  Public
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const search = req.query.search || "";
    const category = req.query.category || "";
    const sort = req.query.sort || "newest";
    
    const skip = (page - 1) * limit;

    // Build query
    const query = {};
    if (search) {
      query.title = { $regex: search, $options: "i" };
    }
    if (category && category !== "All") {
      query.category = category;
    }

    // Build sort
    let sortOptions = { date: -1 }; // Default: newest
    if (sort === "oldest") sortOptions = { date: 1 };
    else if (sort === "az") sortOptions = { title: 1 };
    else if (sort === "za") sortOptions = { title: -1 };

    const total = await NewsArticle.countDocuments(query);
    const articles = await NewsArticle.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    res.json({
      data: articles,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/news/:id
// @desc    Get single news article
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    const article = await NewsArticle.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }
    res.json(article);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/news
// @desc    Create a news article
// @access  Private
router.post("/", auth, upload.single("image"), async (req, res) => {
  try {
    const { title, excerpt, content, date, category } = req.body;
    const article = new NewsArticle({
      title,
      excerpt,
      content,
      date: date || Date.now(),
      category: category || "Uncategorized",
      image: req.file ? req.file.path : "",
    });
    await article.save();
    res.status(201).json(article);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/news/:id
// @desc    Update a news article
// @access  Private
router.put("/:id", auth, upload.single("image"), async (req, res) => {
  try {
    const article = await NewsArticle.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    const { title, excerpt, content, date, category } = req.body;
    if (title) article.title = title;
    if (excerpt) article.excerpt = excerpt;
    if (content) article.content = content;
    if (date) article.date = date;
    if (category) article.category = category;
    if (req.file) article.image = req.file.path;

    await article.save();
    res.json(article);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/news/:id
// @desc    Delete a news article
// @access  Private
router.delete("/:id", auth, async (req, res) => {
  try {
    const article = await NewsArticle.findByIdAndDelete(req.params.id);
    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }
    res.json({ message: "Article deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
