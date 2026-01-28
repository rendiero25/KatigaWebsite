const express = require('express');
const router = express.Router();
const NewsArticle = require('../models/NewsArticle');
const NewsSection = require('../models/NewsSection');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

// @route   GET /api/news/content
// @desc    Get news section content
// @access  Public
router.get('/content', async (req, res) => {
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
router.put('/content', auth, async (req, res) => {
  try {
    let content = await NewsSection.findOne();
    if (!content) {
        content = new NewsSection();
    }
    
    const { title, subtitle } = req.body;
    if (title) content.title = title;
    if (subtitle) content.subtitle = subtitle;

    await content.save();
    res.json(content);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/news
// @desc    Get all news articles
// @access  Public
router.get('/', async (req, res) => {
  try {
    const articles = await NewsArticle.find().sort({ date: -1 });
    res.json(articles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/news/:id
// @desc    Get single news article
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const article = await NewsArticle.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }
    res.json(article);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/news
// @desc    Create a news article
// @access  Private
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const { title, excerpt, content, date } = req.body;
    const article = new NewsArticle({
      title,
      excerpt,
      content,
      date: date || Date.now(),
      image: req.file ? `/uploads/${req.file.filename}` : ''
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
router.put('/:id', auth, upload.single('image'), async (req, res) => {
  try {
    const article = await NewsArticle.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }

    const { title, excerpt, content, date } = req.body;
    if (title) article.title = title;
    if (excerpt) article.excerpt = excerpt;
    if (content) article.content = content;
    if (date) article.date = date;
    if (req.file) article.image = `/uploads/${req.file.filename}`;

    await article.save();
    res.json(article);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/news/:id
// @desc    Delete a news article
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const article = await NewsArticle.findByIdAndDelete(req.params.id);
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }
    res.json({ message: 'Article deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
