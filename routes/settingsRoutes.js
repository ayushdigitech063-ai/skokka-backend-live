import express from 'express';
import SystemSettings from '../models/SystemSettings.js';
import { DEFAULT_AD_CMS_CONFIG, DEFAULT_HOMEPAGE_CMS_CONFIG } from '../data/defaultSettings.js';

const router = express.Router();

const DEFAULT_SETTINGS_MAP = {
  adCmsConfig: DEFAULT_AD_CMS_CONFIG,
  homepageCmsConfig: DEFAULT_HOMEPAGE_CMS_CONFIG,
};

// GET /api/settings/:key → Get CMS / Ads Manager Config from MongoDB (with fallback defaults)
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await SystemSettings.findOne({ key });
    if (!setting) {
      const defaultData = DEFAULT_SETTINGS_MAP[key] || {};
      return res.status(200).json({ success: true, key, data: defaultData });
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
