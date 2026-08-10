import express from 'express';
import Inquiry from '../models/Inquiry.js';

const router = express.Router();

// GET all inquiries for Super Admin
router.get('/', async (req, res) => {
  try {
    const list = await Inquiry.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create new contact inquiry from Contact Us page
router.post('/', async (req, res) => {
  try {
    const { name, email, department, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Name, email, and message are required.' });
    }

    const inquiry = await Inquiry.create({
      name,
      email,
      department: department || 'General Support Desk',
      subject: subject || 'Customer Inquiry',
      message,
    });

    res.status(201).json({ success: true, data: inquiry, message: 'Inquiry submitted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH mark inquiry as resolved / unread / deleted
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await Inquiry.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE inquiry
router.delete('/:id', async (req, res) => {
  try {
    await Inquiry.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Inquiry deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
