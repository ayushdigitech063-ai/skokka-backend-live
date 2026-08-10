import express from 'express';
import SystemSettings from '../models/SystemSettings.js';

const router = express.Router();

// GET /api/settings/:key → Get CMS / Ads Manager Config from MongoDB
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await SystemSettings.findOne({ key });
    if (!setting) {
      return res.status(404).json({ success: false, message: 'Settings key not found in MongoDB' });
    }
    return res.status(200).json({ success: true, key: setting.key, data: setting.data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/settings/:key → Save / Update CMS / Ads Manager Config in MongoDB
router.post('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const data = req.body;
    const setting = await SystemSettings.findOneAndUpdate(
      { key },
      { key, data },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`💾 [MongoDB Settings API] Updated settings key "${key}" in MongoDB Atlas.`);
    return res.status(200).json({ success: true, key: setting.key, data: setting.data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
