import { EscortProfile } from '../models/EscortProfile.js';

// Helper to map MongoDB doc to frontend-compatible shape
const toFrontend = (doc) => ({
  id: doc.skId || doc._id.toString(),
  _mongoId: doc._id.toString(),
  name: doc.name,
  title: doc.title || doc.name,
  city: doc.city,
  location: doc.location,
  category: doc.category,
  age: doc.age,
  rating: doc.rating,
  rate: doc.rate,
  price: doc.price,
  availability: doc.availability,
  tags: doc.tags || [],
  phone: doc.phone,
  whatsapp: doc.whatsapp,
  telegram: doc.telegram || doc.whatsapp || doc.phone,
  photoUrl: doc.photoUrl,
  gallery: doc.gallery || [],
  description: doc.description,
  packageType: doc.packageType,
  isVerified: doc.isVerified,
  isVip: doc.isVip,
  status: doc.status,
  submittedAt: doc.createdAt,
  submittedBy: doc.submittedBy,
});

// ─────────────────────────────────────────────────────────
// @desc    Get all APPROVED profiles (public — homepage & escorts page)
// @route   GET /api/escorts
// @access  Public
// ─────────────────────────────────────────────────────────
export const getPublicEscorts = async (req, res) => {
  try {
    const { city, category, vip, verified } = req.query;
    const filter = { status: 'APPROVED' };
    if (city) filter.city = { $regex: city, $options: 'i' };
    if (category) filter.category = { $regex: category, $options: 'i' };
    if (vip === 'true') filter.isVip = true;
    if (verified === 'true') { filter.isVerified = true; filter.isVip = false; }

    const profiles = await EscortProfile.find(filter).sort({ isVip: -1, isVerified: -1, createdAt: -1 });
    return res.status(200).json({ success: true, count: profiles.length, data: profiles.map(toFrontend) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────
// @desc    Get ALL profiles (admin — includes pending & rejected)
// @route   GET /api/escorts/admin
// @access  Private/Admin
// ─────────────────────────────────────────────────────────
export const getAllEscortsAdmin = async (req, res) => {
  try {
    const profiles = await EscortProfile.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: profiles.length, data: profiles.map(toFrontend) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────
// @desc    Get single escort by skId or _id
// @route   GET /api/escorts/:id
// @access  Public
// ─────────────────────────────────────────────────────────
export const getEscortById = async (req, res) => {
  try {
    const { id } = req.params;
    let extractedId = id.trim();

    // Extract skId (e.g. sk-103) or Mongo ObjectId from compound slug e.g. "priya-sharma-sk-103"
    const skMatch = extractedId.match(/(sk-\d+)/i);
    const mongoMatch = extractedId.match(/([0-9a-fA-F]{24})$/i);

    if (skMatch) {
      extractedId = skMatch[1].toUpperCase();
    } else if (mongoMatch) {
      extractedId = mongoMatch[1];
    }

    let profile = await EscortProfile.findOne({
      $or: [
        { skId: new RegExp(`^${extractedId}$`, 'i') },
        { skId: new RegExp(`^${id}$`, 'i') },
      ],
    });

    if (!profile && extractedId.length === 24) {
      profile = await EscortProfile.findById(extractedId);
    }

    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found.' });
    return res.status(200).json({ success: true, data: toFrontend(profile), profile: toFrontend(profile) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────
// @desc    Create new escort profile (advertiser wizard / admin)
// @route   POST /api/escorts
// @access  Public (advertiser) / Admin
// ─────────────────────────────────────────────────────────
export const createEscort = async (req, res) => {
  try {
    const data = req.body;
    // If submitted by advertiser — always PENDING_APPROVAL & free tier
    const isAdminCreate = req.headers['x-admin-create'] === 'true';
    if (!isAdminCreate) {
      data.status = 'PENDING_APPROVAL';
      data.isVip = false;
      data.isVerified = false;
      data.packageType = 'FREE_STANDARD';
      data.price = 0;
    }
    const profile = await EscortProfile.create(data);
    return res.status(201).json({ success: true, data: toFrontend(profile) });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────
// @desc    Update escort profile (admin)
// @route   PUT /api/escorts/:id
// @access  Private/Admin
// ─────────────────────────────────────────────────────────
export const updateEscort = async (req, res) => {
  try {
    const { id } = req.params;
    let profile = await EscortProfile.findOne({ skId: id });
    if (!profile && id.length === 24) profile = await EscortProfile.findById(id);
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found.' });

    const fields = req.body;
    Object.keys(fields).forEach((k) => { profile[k] = fields[k]; });
    await profile.save();
    return res.status(200).json({ success: true, data: toFrontend(profile) });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────
// @desc    Approve / Reject / Set status (admin)
// @route   PATCH /api/escorts/:id/status
// @access  Private/Admin
// ─────────────────────────────────────────────────────────
export const setEscortStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['APPROVED', 'PENDING_APPROVAL', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }
    let profile = await EscortProfile.findOne({ skId: id });
    if (!profile && id.length === 24) profile = await EscortProfile.findById(id);
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found.' });
    profile.status = status;
    await profile.save();
    return res.status(200).json({ success: true, data: toFrontend(profile) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────
// @desc    Set VIP / Verified / Standard placement (admin)
// @route   PATCH /api/escorts/:id/placement
// @access  Private/Admin
// ─────────────────────────────────────────────────────────
export const setEscortPlacement = async (req, res) => {
  try {
    const { id } = req.params;
    const { placement } = req.body; // "VIP" | "VERIFIED" | "STANDARD"
    let profile = await EscortProfile.findOne({ skId: id });
    if (!profile && id.length === 24) profile = await EscortProfile.findById(id);
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found.' });

    if (placement === 'VIP') {
      profile.isVip = true; profile.isVerified = true; profile.packageType = 'VIP Featured ⭐'; profile.price = profile.price || 6000;
    } else if (placement === 'VERIFIED') {
      profile.isVip = false; profile.isVerified = true; profile.packageType = 'Verified Listing 🛡️'; profile.price = profile.price || 3000;
    } else {
      profile.isVip = false; profile.isVerified = false; profile.packageType = 'FREE_STANDARD'; profile.price = 0;
    }
    await profile.save();
    return res.status(200).json({ success: true, data: toFrontend(profile) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────
// @desc    Delete escort profile (admin)
// @route   DELETE /api/escorts/:id
// @access  Private/Admin
// ─────────────────────────────────────────────────────────
export const deleteEscort = async (req, res) => {
  try {
    const { id } = req.params;
    let profile = await EscortProfile.findOne({ skId: id });
    if (!profile && id.length === 24) profile = await EscortProfile.findById(id);
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found.' });
    await profile.deleteOne();
    return res.status(200).json({ success: true, message: 'Profile deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────
// @desc    Seed default demo profiles (run once via POST /api/escorts/seed)
// @access  Private/Admin
// ─────────────────────────────────────────────────────────
export const seedDefaultProfiles = async (req, res) => {
  try {
    const existing = await EscortProfile.countDocuments();
    if (existing > 0) {
      return res.status(200).json({ success: true, message: `Seed skipped — ${existing} profiles already exist.` });
    }

    const defaults = [
      { skId: 'SK-101', name: 'Ananya Sharma', title: 'Ananya Sharma - Indian VIP Companion', city: 'Jaipur', location: 'Jaipur (Bani Park)', category: 'VIP Escorts', age: 23, rating: 4.9, rate: '₹6,000 / hr', price: 6000, availability: 'Incall / Outcall Rates: ₹6,000 / hr (Night: ₹10,000 / night)', tags: ['VIP', 'Independent', 'Indian Companion', 'Bani Park'], phone: '+91 98765 43210', whatsapp: '919876543210', photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80', gallery: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80'], description: 'High class Indian VIP companion in Jaipur. Available 24/7 for 5-star hotel and private appointments.', packageType: 'VIP Featured ⭐', isVerified: true, isVip: true, status: 'APPROVED' },
      { skId: 'SK-102', name: 'Priya Patel', title: 'Priya Patel - College Escort', city: 'Jaipur', location: 'Jaipur (Malviya Nagar)', category: 'Call Girls', age: 21, rating: 4.8, rate: '₹4,500 / hr', price: 4500, availability: 'Incall / Outcall Rates: ₹4,500 / hr (Night: ₹8,000 / night)', tags: ['Verified', 'Call Girl', 'College Escort', 'Malviya Nagar'], phone: '+91 98123 44556', whatsapp: '919812344556', photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80', gallery: ['https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80'], description: 'Charming independent college model with soft personality. Top rated service in Malviya Nagar, Jaipur.', packageType: 'Verified Listing 🛡️', isVerified: true, isVip: false, status: 'APPROVED' },
      { skId: 'SK-103', name: 'Simran & Neha Duo', title: 'Simran & Neha Duo Escort Service', city: 'Jaipur', location: 'Jaipur (C-Scheme)', category: 'VIP Escorts', age: 24, rating: 4.9, rate: '₹9,000 / hr', price: 9000, availability: 'Incall / Outcall Rates: ₹9,000 / hr (Night: ₹15,000 / night)', tags: ['VIP', 'Duo Escort', 'Luxury', 'C-Scheme'], phone: '+91 97711 22334', whatsapp: '919771122334', photoUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80', gallery: ['https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80'], description: 'Exclusive double companion duo escort service in C-Scheme, Jaipur. Premium luxury hospitality.', packageType: 'VIP Featured ⭐', isVerified: true, isVip: true, status: 'APPROVED' },
      { skId: 'SK-104', name: 'Komal Verma', title: 'Komal Verma - Independent Model', city: 'Jaipur', location: 'Jaipur (Mansarovar)', category: 'Independent Girls', age: 22, rating: 4.8, rate: '₹3,500 / hr', price: 3500, availability: 'Incall / Outcall Rates: ₹3,500 / hr (Night: ₹7,000 / night)', tags: ['Verified', 'Independent Girls', 'Mansarovar'], phone: '+91 99887 66554', whatsapp: '919988766554', photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80', gallery: ['https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80'], description: 'Verified independent companion available in Mansarovar, Jaipur for private meetings.', packageType: 'Verified Package 🛡️', isVerified: true, isVip: false, status: 'APPROVED' },
      { skId: 'SK-105', name: 'Russian Elena', title: 'Russian Elena - Foreign VIP Companion', city: 'Jaipur', location: 'Jaipur (Airport Road)', category: 'Russian Escorts', age: 25, rating: 5.0, rate: '₹14,000 / hr', price: 14000, availability: 'Incall / Outcall Rates: ₹14,000 / hr (Night: ₹25,000 / night)', tags: ['Russian', 'VIP Escorts', 'VIP Featured', 'Airport Road'], phone: '+91 96543 21098', whatsapp: '919654321098', photoUrl: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=600&q=80', gallery: ['https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=600&q=80'], description: 'Genuine foreign Russian VIP companion on Airport Road, Jaipur. 5-Star hotel outcall specialist.', packageType: 'VIP Featured ⭐', isVerified: true, isVip: true, status: 'APPROVED' },
      { skId: 'SK-106', name: 'Pooja Sharma', title: 'Pooja Sharma - Verified Independent Model', city: 'Jaipur', location: 'Jaipur (Vaishali Nagar)', category: 'Call Girls', age: 23, rating: 4.9, rate: '₹4,000 / hr', price: 4000, availability: 'Incall / Outcall Rates: ₹4,000 / hr (Night: ₹8,000 / night)', tags: ['Verified', 'Call Girl', 'Vaishali Nagar'], phone: '+91 98989 11223', whatsapp: '919898911223', photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80', gallery: ['https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80'], description: 'Selfie verified independent model in Vaishali Nagar, Jaipur. Discrete & friendly service.', packageType: 'Verified Package 🛡️', isVerified: true, isVip: false, status: 'APPROVED' },
    ];

    await EscortProfile.insertMany(defaults);
    return res.status(201).json({ success: true, message: `✅ Seeded ${defaults.length} default escort profiles into MongoDB.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
