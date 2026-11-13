import { EscortProfile } from '../models/EscortProfile.js';
import { processProfileImages } from '../services/watermarkService.js';

// Helper to map MongoDB doc to full frontend shape (for single profile & admin panel)
const toFrontend = (doc) => ({
  id: doc.skId || doc._id?.toString() || "",
  _mongoId: doc._id?.toString() || "",
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
  isSuperTop: doc.isSuperTop || doc.packageType === "SUPER_TOP" || doc.packageType?.includes("SUPER_TOP") || false,
  status: doc.status,
  submittedAt: doc.createdAt,
  submittedBy: doc.submittedBy,
});

// Helper to map MongoDB doc to public frontend listing shape (lightweight)
const toPublicFrontend = (doc) => ({
  id: doc.skId || doc._id?.toString() || "",
  _mongoId: doc._id?.toString() || "",
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
  photoUrl:
    typeof doc.photoUrl === 'string' && !doc.photoUrl.startsWith('data:')
      ? doc.photoUrl
      : null,
  gallery: [],
  description: doc.description,
  packageType: doc.packageType,
  isVerified: doc.isVerified,
  isVip: doc.isVip,
  isSuperTop: doc.isSuperTop || doc.packageType === "SUPER_TOP" || doc.packageType?.includes("SUPER_TOP") || false,
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

    const profiles = await EscortProfile.find(filter)
      .select('-gallery')
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({ success: true, count: profiles.length, data: profiles.map(toPublicFrontend) });
  } catch (err) {
    console.error("🔥 Error in getPublicEscorts:", err);
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
// @desc    Get ads submitted by a specific user / advertiser
// @route   GET /api/escorts/user-ads
// @access  Public
// ─────────────────────────────────────────────────────────
export const getUserEscorts = async (req, res) => {
  try {
    const { email, phone } = req.query;
    if (!email && !phone) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    const conditions = [];
    if (email && typeof email === 'string' && email.trim()) {
      const cleanEmail = email.trim();
      conditions.push({ submittedBy: { $regex: new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } });
    }
    if (phone && typeof phone === 'string' && phone.trim()) {
      const cleanPhone = phone.trim().replace(/[^0-9]/g, '');
      if (cleanPhone) {
        conditions.push({ phone: { $regex: new RegExp(cleanPhone, 'i') } });
      }
    }

    const filter = conditions.length > 1 ? { $or: conditions } : conditions[0];
    const profiles = await EscortProfile.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: profiles.length,
      data: profiles.map(toFrontend),
    });
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

    // Extract skId (e.g. sk-103 or ad-1234) or Mongo ObjectId from compound slug e.g. "priya-sharma-sk-103"
    const skMatch = extractedId.match(/(sk-\d+|ad-\d+)/i);
    const mongoMatch = extractedId.match(/([0-9a-fA-F]{24})$/i);

    if (skMatch) {
      extractedId = skMatch[1].toUpperCase();
    } else if (mongoMatch) {
      extractedId = mongoMatch[1];
    }

    const safeExtracted = extractedId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const safeRawId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    let profile = await EscortProfile.findOne({
      $or: [
        { skId: { $regex: new RegExp(`^${safeExtracted}$`, 'i') } },
        { skId: { $regex: new RegExp(`^${safeRawId}$`, 'i') } },
        { id: { $regex: new RegExp(`^${safeExtracted}$`, 'i') } },
        { id: { $regex: new RegExp(`^${safeRawId}$`, 'i') } },
        { skId: extractedId },
        { skId: id },
        { id: extractedId },
        { id: id },
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
    let data = { ...req.body };

    // ⚠️ Always strip skId and id from incoming payload — the pre-save hook
    // generates a guaranteed-unique skId.
    delete data.skId;
    delete data.id;
    delete data._mongoId;

    // Apply global mandatory MyCityQueen server-side watermark to content images
    data = await processProfileImages(data);

    // Advertiser post ads auto-approval
    const isAdminCreate = req.headers['x-admin-create'] === 'true';
    if (!isAdminCreate) {
      data.status = 'APPROVED';
      // Ensure default packageType if missing
      if (!data.packageType) data.packageType = 'FREE_STANDARD';
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

    let fields = { ...req.body };

    // Apply global mandatory MyCityQueen server-side watermark to updated content images
    fields = await processProfileImages(fields);

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

    // When approving, activate SUPER_TOP / VIP / Verified flags based on package
    if (status === 'APPROVED') {
      const pkg = (profile.packageType || '').toUpperCase();
      if (pkg.includes('SUPER_TOP') || profile.isSuperTop || (profile.price && profile.price >= 6999)) {
        profile.isSuperTop = true;
        profile.isVip = true;
        profile.isVerified = true;
      } else if (pkg.includes('VIP') || profile.isVip || (profile.price && profile.price >= 4999)) {
        profile.isVip = true;
        profile.isVerified = true;
      } else if (pkg.includes('VERIFIED') || profile.isVerified || (profile.price && profile.price > 0)) {
        profile.isVerified = true;
      }
    }

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

    if (placement === 'SUPER_TOP') {
      profile.isSuperTop = true; profile.isVip = true; profile.isVerified = true; profile.packageType = 'SUPER TOP Booster ⚡'; profile.price = profile.price || 6999;
    } else if (placement === 'VIP') {
      profile.isSuperTop = false; profile.isVip = true; profile.isVerified = true; profile.packageType = 'VIP Featured ⭐'; profile.price = profile.price || 4999;
    } else if (placement === 'VERIFIED') {
      profile.isSuperTop = false; profile.isVip = false; profile.isVerified = true; profile.packageType = 'Verified Listing 🛡️'; profile.price = profile.price || 2499;
    } else {
      profile.isSuperTop = false; profile.isVip = false; profile.isVerified = false; profile.packageType = 'FREE_STANDARD'; profile.price = 0;
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
  return res.status(200).json({ success: true, message: 'Default demo profile seeding is disabled.' });
};
