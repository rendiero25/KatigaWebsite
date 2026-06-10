const express = require('express');
const router = express.Router();
const ContactInfo = require('../models/ContactInfo');
const ContactSubmission = require('../models/ContactSubmission');
const auth = require('../middleware/auth');

// @route   GET /api/contact/info
// @desc    Get contact info
// @access  Public
router.get('/info', async (req, res) => {
  try {
    let info = await ContactInfo.findOne();
    if (!info) {
      info = await ContactInfo.create({});
    }
    res.json(info);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/contact/info
// @desc    Update contact info
// @access  Private
router.put('/info', auth, async (req, res) => {
  try {
    let info = await ContactInfo.findOne();
    if (!info) {
      info = new ContactInfo({});
    }

    const { phone, whatsapp, email, address } = req.body;
    if (phone) info.phone = phone;
    if (whatsapp) info.whatsapp = whatsapp;
    if (email) info.email = email;
    if (address) info.address = address;

    await info.save();
    res.json(info);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/contact/submit
// @desc    Submit contact form
// @access  Public
router.post('/submit', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    const submission = new ContactSubmission({
      name,
      email,
      phone,
      subject,
      message
    });
    await submission.save();
    res.status(201).json({ message: 'Message sent successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/contact/submissions
// @desc    Get all contact submissions
// @access  Private
router.get('/submissions', auth, async (req, res) => {
  try {
    const submissions = await ContactSubmission.find().sort({ date: -1 });
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/contact/submissions/:id/read
// @desc    Mark submission as read
// @access  Private
router.put('/submissions/:id/read', auth, async (req, res) => {
  try {
    const submission = await ContactSubmission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }
    submission.isRead = true;
    await submission.save();
    res.json(submission);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/contact/submissions/:id
// @desc    Delete a submission
// @access  Private
router.delete('/submissions/:id', auth, async (req, res) => {
  try {
    const submission = await ContactSubmission.findByIdAndDelete(req.params.id);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }
    res.json({ message: 'Submission deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
