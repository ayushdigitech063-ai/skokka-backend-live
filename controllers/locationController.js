import State from '../models/State.js';
import City from '../models/City.js';
import Area from '../models/Area.js';
import { generateSlug } from '../utils/slugify.js';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SEO_UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads', 'seo');
if (!fs.existsSync(SEO_UPLOADS_DIR)) {
  fs.mkdirSync(SEO_UPLOADS_DIR, { recursive: true });
}
const PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://mycityqueen.com/x';

// ==========================================
// STATE CONTROLLERS
// ==========================================

/**
 * @desc    Create a new State
 * @route   POST /api/locations/states
 * @access  Private/Admin
 */
export const createState = async (req, res) => {
  try {
    const {
      name,
      code,
      sortOrder,
      metaTitle,
      metaDescription,
      customSlug,
      focusKeywords,
      ogImage,
      ogTitle,
      ogDescription,
      popularDistricts,
      pageContent,
      canonicalUrl,
      robots,
      redirectUrl,
      redirectType,
      customSchema,
      faqs,
      isActive,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'State name is required' });
    }

    const cleanName = name.trim();
    const cleanCustomSlug = customSlug && typeof customSlug === 'string' ? customSlug.trim() : '';
    const slug = cleanCustomSlug ? generateSlug(cleanCustomSlug) : generateSlug(cleanName);

    // Check duplicate state name or slug among non-deleted states
    const existing = await State.findOne({
      $or: [{ name: { $regex: new RegExp(`^${cleanName}$`, 'i') } }, { slug }],
      isDeleted: false,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `State with name '${cleanName}' or slug '${slug}' already exists`,
      });
    }

    const formattedKeywords = Array.isArray(focusKeywords)
      ? focusKeywords.map((k) => String(k).trim()).filter(Boolean)
      : typeof focusKeywords === 'string'
      ? focusKeywords.split(',').map((k) => k.trim()).filter(Boolean)
      : [];

    const formattedDistricts = Array.isArray(popularDistricts)
      ? popularDistricts.map((d) => String(d).trim()).filter(Boolean)
      : typeof popularDistricts === 'string'
      ? popularDistricts.split(',').map((d) => d.trim()).filter(Boolean)
      : [];

    const formattedFaqs = Array.isArray(faqs)
      ? faqs
          .map((f) => ({
            question: String(f.question || '').trim(),
            answer: String(f.answer || '').trim(),
          }))
          .filter((f) => f.question || f.answer)
      : [];

    const state = await State.create({
      name: cleanName,
      code: code ? code.trim().toUpperCase() : '',
      slug,
      customSlug: cleanCustomSlug,
      sortOrder: sortOrder || 0,
      metaTitle: metaTitle || '',
      metaDescription: metaDescription || '',
      focusKeywords: formattedKeywords,
      ogImage: ogImage ? String(ogImage).trim() : '',
      ogTitle: ogTitle ? String(ogTitle).trim() : '',
      ogDescription: ogDescription ? String(ogDescription).trim() : '',
      popularDistricts: formattedDistricts,
      pageContent: pageContent ? String(pageContent).trim() : '',
      canonicalUrl: canonicalUrl ? String(canonicalUrl).trim() : '',
      robots: robots ? String(robots).trim() : 'index, follow',
      redirectUrl: redirectUrl ? String(redirectUrl).trim() : '',
      redirectType: redirectType ? String(redirectType).trim() : 'none',
      customSchema: customSchema ? String(customSchema).trim() : '',
      faqs: formattedFaqs,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    res.status(201).json({
      success: true,
      message: 'State created successfully',
      state,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get all States
 * @route   GET /api/locations/states
 * @access  Public
 */
export const getStates = async (req, res) => {
  try {
    const { includeDeleted, isActive, search } = req.query;
    const filter = {};

    if (includeDeleted !== 'true') {
      filter.isDeleted = false;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const states = await State.find(filter)
      .sort({ sortOrder: 1, name: 1 })
      .populate({
        path: 'cities',
        select: 'name slug tier isPopular isActive',
      });

    res.status(200).json({
      success: true,
      count: states.length,
      states,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get single State by ID or Slug
 * @route   GET /api/locations/states/:idOrSlug
 * @access  Public
 */
export const getStateById = async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    const isObjectId = idOrSlug.match(/^[0-9a-fA-F]{24}$/);

    const query = isObjectId
      ? { _id: idOrSlug }
      : {
          $or: [
            { slug: idOrSlug.toLowerCase() },
            { customSlug: idOrSlug.toLowerCase() },
            { name: { $regex: new RegExp(`^${idOrSlug.replace(/-/g, ' ')}$`, 'i') } },
            { name: { $regex: new RegExp(`^${idOrSlug}$`, 'i') } },
          ],
        };
    query.isDeleted = false;

    const state = await State.findOne(query).populate({
      path: 'cities',
      select: 'name slug tier isPopular isActive sortOrder',
    });

    if (!state) {
      return res.status(404).json({ success: false, message: 'State not found' });
    }

    res.status(200).json({ success: true, state });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update a State
 * @route   PUT /api/locations/states/:id
 * @access  Private/Admin
 */
export const updateState = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      code,
      sortOrder,
      metaTitle,
      metaDescription,
      customSlug,
      focusKeywords,
      ogImage,
      ogTitle,
      ogDescription,
      popularDistricts,
      pageContent,
      canonicalUrl,
      robots,
      redirectUrl,
      redirectType,
      customSchema,
      faqs,
      isActive,
    } = req.body;

    const state = await State.findOne({ _id: id, isDeleted: false });
    if (!state) {
      return res.status(404).json({ success: false, message: 'State not found' });
    }

    // Handle Custom Slug or Name Slug
    if (customSlug !== undefined) {
      const cleanCustomSlug = typeof customSlug === 'string' ? customSlug.trim() : '';
      state.customSlug = cleanCustomSlug;
      if (cleanCustomSlug) {
        const newSlug = generateSlug(cleanCustomSlug);
        const duplicate = await State.findOne({
          _id: { $ne: id },
          slug: newSlug,
          isDeleted: false,
        });
        if (duplicate) {
          return res.status(400).json({
            success: false,
            message: `A state with slug '${newSlug}' already exists`,
          });
        }
        state.slug = newSlug;
      } else if (name && name.trim()) {
        state.slug = generateSlug(name.trim());
      } else {
        state.slug = generateSlug(state.name);
      }
    }

    if (name && name.trim() !== state.name) {
      const cleanName = name.trim();
      const newSlug = state.customSlug ? generateSlug(state.customSlug) : generateSlug(cleanName);

      const duplicate = await State.findOne({
        _id: { $ne: id },
        $or: [{ name: { $regex: new RegExp(`^${cleanName}$`, 'i') } }, { slug: newSlug }],
        isDeleted: false,
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `State with name '${cleanName}' or slug '${newSlug}' already exists`,
        });
      }

      state.name = cleanName;
      if (!state.customSlug) {
        state.slug = newSlug;
      }
    }

    if (code !== undefined) state.code = code.trim().toUpperCase();
    if (sortOrder !== undefined) state.sortOrder = Number(sortOrder);
    if (metaTitle !== undefined) state.metaTitle = metaTitle;
    if (metaDescription !== undefined) state.metaDescription = metaDescription;
    if (ogImage !== undefined) state.ogImage = String(ogImage || '').trim();
    if (ogTitle !== undefined) state.ogTitle = String(ogTitle || '').trim();
    if (ogDescription !== undefined) state.ogDescription = String(ogDescription || '').trim();
    if (pageContent !== undefined) state.pageContent = String(pageContent || '').trim();
    if (canonicalUrl !== undefined) state.canonicalUrl = String(canonicalUrl || '').trim();
    if (robots !== undefined) state.robots = String(robots || '').trim();
    if (redirectUrl !== undefined) state.redirectUrl = String(redirectUrl || '').trim();
    if (redirectType !== undefined) state.redirectType = String(redirectType || 'none').trim();
    if (customSchema !== undefined) state.customSchema = String(customSchema || '').trim();

    if (focusKeywords !== undefined) {
      state.focusKeywords = Array.isArray(focusKeywords)
        ? focusKeywords.map((k) => String(k).trim()).filter(Boolean)
        : typeof focusKeywords === 'string'
        ? focusKeywords.split(',').map((k) => k.trim()).filter(Boolean)
        : [];
    }

    if (popularDistricts !== undefined) {
      state.popularDistricts = Array.isArray(popularDistricts)
        ? popularDistricts.map((d) => String(d).trim()).filter(Boolean)
        : typeof popularDistricts === 'string'
        ? popularDistricts.split(',').map((d) => d.trim()).filter(Boolean)
        : [];
    }

    if (faqs !== undefined) {
      state.faqs = Array.isArray(faqs)
        ? faqs
            .map((f) => ({
              question: String(f.question || '').trim(),
              answer: String(f.answer || '').trim(),
            }))
            .filter((f) => f.question || f.answer)
        : [];
    }

    if (isActive !== undefined) state.isActive = Boolean(isActive);

    await state.save();

    res.status(200).json({
      success: true,
      message: 'State updated successfully',
      state,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Soft delete a State
 * @route   DELETE /api/locations/states/:id
 * @access  Private/Admin
 */
export const deleteState = async (req, res) => {
  try {
    const { id } = req.params;

    const state = await State.findOne({ _id: id, isDeleted: false });
    if (!state) {
      return res.status(404).json({ success: false, message: 'State not found' });
    }

    state.isDeleted = true;
    state.isActive = false;
    await state.save();

    // Soft delete associated cities and areas
    await City.updateMany({ stateId: id }, { isDeleted: true, isActive: false });
    await Area.updateMany({ stateId: id }, { isDeleted: true, isActive: false });

    res.status(200).json({
      success: true,
      message: 'State and its associated cities/areas soft-deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Toggle State Active Status
 * @route   PATCH /api/locations/states/:id/status
 * @access  Private/Admin
 */
export const toggleStateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const state = await State.findOne({ _id: id, isDeleted: false });

    if (!state) {
      return res.status(404).json({ success: false, message: 'State not found' });
    }

    state.isActive = !state.isActive;
    await state.save();

    res.status(200).json({
      success: true,
      message: `State ${state.isActive ? 'enabled' : 'disabled'} successfully`,
      isActive: state.isActive,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// CITY CONTROLLERS
// ==========================================

/**
 * @desc    Create a new City
 * @route   POST /api/locations/cities
 * @access  Private/Admin
 */
export const createCity = async (req, res) => {
  try {
    const {
      name,
      stateId,
      tier,
      isPopular,
      sortOrder,
      metaTitle,
      metaDescription,
      customSlug,
      focusKeywords,
      ogImage,
      ogTitle,
      ogDescription,
      microServiceAreas,
      pageContent,
      canonicalUrl,
      robots,
      redirectUrl,
      redirectType,
      customSchema,
      faqs,
      isActive,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'City name is required' });
    }
    if (!stateId) {
      return res.status(400).json({ success: false, message: 'State ID is required' });
    }

    const state = await State.findOne({ _id: stateId, isDeleted: false });
    if (!state) {
      return res.status(404).json({ success: false, message: 'Associated state not found' });
    }

    const cleanName = name.trim();
    const cleanCustomSlug = customSlug && typeof customSlug === 'string' ? customSlug.trim() : '';
    const slug = cleanCustomSlug ? generateSlug(cleanCustomSlug) : generateSlug(cleanName);

    // Prevent duplicate city in the same state
    const existing = await City.findOne({
      stateId,
      $or: [{ name: { $regex: new RegExp(`^${cleanName}$`, 'i') } }, { slug }],
      isDeleted: false,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `City '${cleanName}' or slug '${slug}' already exists in state '${state.name}'`,
      });
    }

    // Format keywords
    const formattedKeywords = Array.isArray(focusKeywords)
      ? focusKeywords.map((k) => String(k).trim()).filter(Boolean)
      : typeof focusKeywords === 'string'
      ? focusKeywords.split(',').map((k) => k.trim()).filter(Boolean)
      : [];

    // Format micro service areas
    const formattedAreas = Array.isArray(microServiceAreas)
      ? microServiceAreas.map((a) => String(a).trim()).filter(Boolean)
      : typeof microServiceAreas === 'string'
      ? microServiceAreas.split(',').map((a) => a.trim()).filter(Boolean)
      : [];

    // Format FAQs
    const formattedFaqs = Array.isArray(faqs)
      ? faqs
          .map((f) => ({
            question: String(f.question || '').trim(),
            answer: String(f.answer || '').trim(),
          }))
          .filter((f) => f.question || f.answer)
      : [];

    const city = await City.create({
      name: cleanName,
      stateId,
      slug,
      customSlug: cleanCustomSlug,
      tier: tier || 'Tier 2',
      isPopular: isPopular !== undefined ? Boolean(isPopular) : false,
      sortOrder: sortOrder || 0,
      metaTitle: metaTitle || '',
      metaDescription: metaDescription || '',
      focusKeywords: formattedKeywords,
      ogImage: ogImage ? String(ogImage).trim() : '',
      ogTitle: ogTitle ? String(ogTitle).trim() : '',
      ogDescription: ogDescription ? String(ogDescription).trim() : '',
      microServiceAreas: formattedAreas,
      pageContent: pageContent ? String(pageContent).trim() : '',
      canonicalUrl: canonicalUrl ? String(canonicalUrl).trim() : '',
      robots: robots ? String(robots).trim() : 'index, follow',
      redirectUrl: redirectUrl ? String(redirectUrl).trim() : '',
      redirectType: redirectType ? String(redirectType).trim() : 'none',
      customSchema: customSchema ? String(customSchema).trim() : '',
      faqs: formattedFaqs,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    res.status(201).json({
      success: true,
      message: 'City created successfully',
      city,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get all Cities
 * @route   GET /api/locations/cities
 * @access  Public
 */
export const getCities = async (req, res) => {
  try {
    const { stateId, isPopular, isActive, includeDeleted, search } = req.query;
    const filter = {};

    if (includeDeleted !== 'true') {
      filter.isDeleted = false;
    }

    if (stateId) {
      filter.stateId = stateId;
    }

    if (isPopular !== undefined) {
      filter.isPopular = isPopular === 'true';
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const cities = await City.find(filter)
      .sort({ sortOrder: 1, name: 1 })
      .populate('stateId', 'name slug code')
      .populate({
        path: 'areas',
        select: 'name slug pincode isPopular isActive',
      });

    res.status(200).json({
      success: true,
      count: cities.length,
      cities,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get single City by ID or Slug
 * @route   GET /api/locations/cities/:idOrSlug
 * @access  Public
 */
export const getCityById = async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    const isObjectId = idOrSlug.match(/^[0-9a-fA-F]{24}$/);

    const query = isObjectId
      ? { _id: idOrSlug }
      : {
          $or: [
            { slug: idOrSlug.toLowerCase() },
            { customSlug: idOrSlug.toLowerCase() },
            { name: { $regex: new RegExp(`^${idOrSlug.replace(/-/g, ' ')}$`, 'i') } },
            { name: { $regex: new RegExp(`^${idOrSlug}$`, 'i') } },
          ],
        };
    query.isDeleted = false;

    const city = await City.findOne(query)
      .populate('stateId', 'name slug code')
      .populate({
        path: 'areas',
        select: 'name slug pincode isPopular isActive sortOrder',
      });

    if (!city) {
      return res.status(404).json({ success: false, message: 'City not found' });
    }

    res.status(200).json({ success: true, city });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update a City
 * @route   PUT /api/locations/cities/:id
 * @access  Private/Admin
 */
export const updateCity = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      stateId,
      tier,
      isPopular,
      sortOrder,
      metaTitle,
      metaDescription,
      customSlug,
      focusKeywords,
      ogImage,
      ogTitle,
      ogDescription,
      microServiceAreas,
      pageContent,
      canonicalUrl,
      robots,
      redirectUrl,
      redirectType,
      customSchema,
      faqs,
      isActive,
    } = req.body;

    const city = await City.findOne({ _id: id, isDeleted: false });
    if (!city) {
      return res.status(404).json({ success: false, message: 'City not found' });
    }

    const targetStateId = stateId || city.stateId;

    if (stateId && String(stateId) !== String(city.stateId)) {
      const stateExists = await State.findOne({ _id: stateId, isDeleted: false });
      if (!stateExists) {
        return res.status(404).json({ success: false, message: 'Associated state not found' });
      }
      city.stateId = stateId;
    }

    // Handle Custom Slug or Name Slug
    if (customSlug !== undefined) {
      const cleanCustomSlug = typeof customSlug === 'string' ? customSlug.trim() : '';
      city.customSlug = cleanCustomSlug;
      if (cleanCustomSlug) {
        const newSlug = generateSlug(cleanCustomSlug);
        const duplicate = await City.findOne({
          _id: { $ne: id },
          stateId: targetStateId,
          slug: newSlug,
          isDeleted: false,
        });
        if (duplicate) {
          return res.status(400).json({
            success: false,
            message: `A city with slug '${newSlug}' already exists in this state`,
          });
        }
        city.slug = newSlug;
      } else if (name && name.trim()) {
        city.slug = generateSlug(name.trim());
      } else {
        city.slug = generateSlug(city.name);
      }
    }

    if (name && name.trim() !== city.name) {
      const cleanName = name.trim();
      const newSlug = city.customSlug ? generateSlug(city.customSlug) : generateSlug(cleanName);

      const duplicate = await City.findOne({
        _id: { $ne: id },
        stateId: targetStateId,
        $or: [{ name: { $regex: new RegExp(`^${cleanName}$`, 'i') } }, { slug: newSlug }],
        isDeleted: false,
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `City with name '${cleanName}' or slug '${newSlug}' already exists in this state`,
        });
      }

      city.name = cleanName;
      if (!city.customSlug) {
        city.slug = newSlug;
      }
    }

    if (tier !== undefined) city.tier = tier;
    if (isPopular !== undefined) city.isPopular = Boolean(isPopular);
    if (sortOrder !== undefined) city.sortOrder = Number(sortOrder);
    if (metaTitle !== undefined) city.metaTitle = metaTitle;
    if (metaDescription !== undefined) city.metaDescription = metaDescription;
    if (ogImage !== undefined) city.ogImage = String(ogImage || '').trim();
    if (ogTitle !== undefined) city.ogTitle = String(ogTitle || '').trim();
    if (ogDescription !== undefined) city.ogDescription = String(ogDescription || '').trim();
    if (pageContent !== undefined) city.pageContent = String(pageContent || '').trim();
    if (canonicalUrl !== undefined) city.canonicalUrl = String(canonicalUrl || '').trim();
    if (robots !== undefined) city.robots = String(robots || '').trim();
    if (redirectUrl !== undefined) city.redirectUrl = String(redirectUrl || '').trim();
    if (redirectType !== undefined) city.redirectType = String(redirectType || 'none').trim();
    if (customSchema !== undefined) city.customSchema = String(customSchema || '').trim();

    if (focusKeywords !== undefined) {
      city.focusKeywords = Array.isArray(focusKeywords)
        ? focusKeywords.map((k) => String(k).trim()).filter(Boolean)
        : typeof focusKeywords === 'string'
        ? focusKeywords.split(',').map((k) => k.trim()).filter(Boolean)
        : [];
    }

    if (microServiceAreas !== undefined) {
      city.microServiceAreas = Array.isArray(microServiceAreas)
        ? microServiceAreas.map((a) => String(a).trim()).filter(Boolean)
        : typeof microServiceAreas === 'string'
        ? microServiceAreas.split(',').map((a) => a.trim()).filter(Boolean)
        : [];
    }

    if (faqs !== undefined) {
      city.faqs = Array.isArray(faqs)
        ? faqs
            .map((f) => ({
              question: String(f.question || '').trim(),
              answer: String(f.answer || '').trim(),
            }))
            .filter((f) => f.question || f.answer)
        : [];
    }

    if (isActive !== undefined) city.isActive = Boolean(isActive);

    await city.save();

    res.status(200).json({
      success: true,
      message: 'City updated successfully',
      city,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Soft delete a City
 * @route   DELETE /api/locations/cities/:id
 * @access  Private/Admin
 */
export const deleteCity = async (req, res) => {
  try {
    const { id } = req.params;

    const city = await City.findOne({ _id: id, isDeleted: false });
    if (!city) {
      return res.status(404).json({ success: false, message: 'City not found' });
    }

    city.isDeleted = true;
    city.isActive = false;
    await city.save();

    // Soft delete associated areas
    await Area.updateMany({ cityId: id }, { isDeleted: true, isActive: false });

    res.status(200).json({
      success: true,
      message: 'City and associated areas soft-deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Toggle City Active Status
 * @route   PATCH /api/locations/cities/:id/status
 * @access  Private/Admin
 */
export const toggleCityStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const city = await City.findOne({ _id: id, isDeleted: false });

    if (!city) {
      return res.status(404).json({ success: false, message: 'City not found' });
    }

    city.isActive = !city.isActive;
    await city.save();

    res.status(200).json({
      success: true,
      message: `City ${city.isActive ? 'enabled' : 'disabled'} successfully`,
      isActive: city.isActive,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// AREA CONTROLLERS
// ==========================================

/**
 * @desc    Create a new Area
 * @route   POST /api/locations/areas
 * @access  Private/Admin
 */
export const createArea = async (req, res) => {
  try {
    const {
      name,
      cityId,
      pincode,
      isPopular,
      sortOrder,
      metaTitle,
      metaDescription,
      customSlug,
      canonicalUrl,
      robots,
      redirectUrl,
      redirectType,
      focusKeywords,
      ogImage,
      ogTitle,
      ogDescription,
      pageContent,
      customSchema,
      faqs,
      isActive,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Area name is required' });
    }
    if (!cityId) {
      return res.status(400).json({ success: false, message: 'City ID is required' });
    }

    const city = await City.findOne({ _id: cityId, isDeleted: false });
    if (!city) {
      return res.status(404).json({ success: false, message: 'Associated city not found' });
    }

    const cleanName = name.trim();
    const cleanCustomSlug = customSlug && typeof customSlug === 'string' ? customSlug.trim() : '';
    const slug = cleanCustomSlug ? generateSlug(cleanCustomSlug) : generateSlug(cleanName);

    // Prevent duplicate area in the same city
    const existing = await Area.findOne({
      cityId,
      $or: [{ name: { $regex: new RegExp(`^${cleanName}$`, 'i') } }, { slug }],
      isDeleted: false,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Area '${cleanName}' or slug '${slug}' already exists in city '${city.name}'`,
      });
    }

    const formattedKeywords = Array.isArray(focusKeywords)
      ? focusKeywords.map((k) => String(k).trim()).filter(Boolean)
      : typeof focusKeywords === 'string'
      ? focusKeywords.split(',').map((k) => k.trim()).filter(Boolean)
      : [];

    const formattedFaqs = Array.isArray(faqs)
      ? faqs
          .map((f) => ({
            question: String(f.question || '').trim(),
            answer: String(f.answer || '').trim(),
          }))
          .filter((f) => f.question || f.answer)
      : [];

    const area = await Area.create({
      name: cleanName,
      cityId,
      stateId: city.stateId, // derive stateId automatically from City
      pincode: pincode ? pincode.trim() : '',
      slug,
      customSlug: cleanCustomSlug,
      isPopular: isPopular !== undefined ? Boolean(isPopular) : false,
      sortOrder: sortOrder || 0,
      metaTitle: metaTitle || '',
      metaDescription: metaDescription || '',
      canonicalUrl: canonicalUrl ? String(canonicalUrl).trim() : '',
      robots: robots ? String(robots).trim() : 'index, follow',
      redirectUrl: redirectUrl ? String(redirectUrl).trim() : '',
      redirectType: redirectType ? String(redirectType).trim() : 'none',
      focusKeywords: formattedKeywords,
      ogImage: ogImage ? String(ogImage).trim() : '',
      ogTitle: ogTitle ? String(ogTitle).trim() : '',
      ogDescription: ogDescription ? String(ogDescription).trim() : '',
      pageContent: pageContent ? String(pageContent).trim() : '',
      customSchema: customSchema ? String(customSchema).trim() : '',
      faqs: formattedFaqs,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    res.status(201).json({
      success: true,
      message: 'Area created successfully',
      area,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get all Areas
 * @route   GET /api/locations/areas
 * @access  Public
 */
export const getAreas = async (req, res) => {
  try {
    const { cityId, stateId, isPopular, isActive, includeDeleted, search } = req.query;
    const filter = {};

    if (includeDeleted !== 'true') {
      filter.isDeleted = false;
    }

    if (cityId) filter.cityId = cityId;
    if (stateId) filter.stateId = stateId;

    if (isPopular !== undefined) {
      filter.isPopular = isPopular === 'true';
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const areas = await Area.find(filter)
      .sort({ sortOrder: 1, name: 1 })
      .populate('cityId', 'name slug tier')
      .populate('stateId', 'name slug code');

    res.status(200).json({
      success: true,
      count: areas.length,
      areas,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get single Area by ID or Slug
 * @route   GET /api/locations/areas/:idOrSlug
 * @access  Public
 */
export const getAreaById = async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    const isObjectId = idOrSlug.match(/^[0-9a-fA-F]{24}$/);

    const query = isObjectId
      ? { _id: idOrSlug }
      : {
          $or: [
            { slug: idOrSlug.toLowerCase() },
            { customSlug: idOrSlug.toLowerCase() },
          ],
        };
    query.isDeleted = false;

    const area = await Area.findOne(query)
      .populate('cityId', 'name slug tier')
      .populate('stateId', 'name slug code');

    if (!area) {
      return res.status(404).json({ success: false, message: 'Area not found' });
    }

    res.status(200).json({ success: true, area });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update an Area
 * @route   PUT /api/locations/areas/:id
 * @access  Private/Admin
 */
export const updateArea = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      cityId,
      pincode,
      isPopular,
      sortOrder,
      metaTitle,
      metaDescription,
      customSlug,
      canonicalUrl,
      robots,
      redirectUrl,
      redirectType,
      focusKeywords,
      ogImage,
      ogTitle,
      ogDescription,
      pageContent,
      customSchema,
      faqs,
      isActive,
    } = req.body;

    const area = await Area.findOne({ _id: id, isDeleted: false });
    if (!area) {
      return res.status(404).json({ success: false, message: 'Area not found' });
    }

    const targetCityId = cityId || area.cityId;

    if (cityId && String(cityId) !== String(area.cityId)) {
      const city = await City.findOne({ _id: cityId, isDeleted: false });
      if (!city) {
        return res.status(404).json({ success: false, message: 'Associated city not found' });
      }
      area.cityId = cityId;
      area.stateId = city.stateId;
    }

    // Handle Custom Slug or Name Slug
    if (customSlug !== undefined) {
      const cleanCustomSlug = typeof customSlug === 'string' ? customSlug.trim() : '';
      area.customSlug = cleanCustomSlug;
      if (cleanCustomSlug) {
        const newSlug = generateSlug(cleanCustomSlug);
        const duplicate = await Area.findOne({
          _id: { $ne: id },
          cityId: targetCityId,
          slug: newSlug,
          isDeleted: false,
        });
        if (duplicate) {
          return res.status(400).json({
            success: false,
            message: `An area with slug '${newSlug}' already exists in this city`,
          });
        }
        area.slug = newSlug;
      } else if (name && name.trim()) {
        area.slug = generateSlug(name.trim());
      } else {
        area.slug = generateSlug(area.name);
      }
    }

    if (name && name.trim() !== area.name) {
      const cleanName = name.trim();
      const newSlug = area.customSlug ? generateSlug(area.customSlug) : generateSlug(cleanName);

      const duplicate = await Area.findOne({
        _id: { $ne: id },
        cityId: targetCityId,
        $or: [{ name: { $regex: new RegExp(`^${cleanName}$`, 'i') } }, { slug: newSlug }],
        isDeleted: false,
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `Area with name '${cleanName}' or slug '${newSlug}' already exists in this city`,
        });
      }

      area.name = cleanName;
      if (!area.customSlug) {
        area.slug = newSlug;
      }
    }

    if (pincode !== undefined) area.pincode = pincode.trim();
    if (isPopular !== undefined) area.isPopular = Boolean(isPopular);
    if (sortOrder !== undefined) area.sortOrder = Number(sortOrder);
    if (metaTitle !== undefined) area.metaTitle = metaTitle;
    if (metaDescription !== undefined) area.metaDescription = metaDescription;
    if (ogImage !== undefined) area.ogImage = String(ogImage || '').trim();
    if (ogTitle !== undefined) area.ogTitle = String(ogTitle || '').trim();
    if (ogDescription !== undefined) area.ogDescription = String(ogDescription || '').trim();
    if (pageContent !== undefined) area.pageContent = String(pageContent || '').trim();
    if (canonicalUrl !== undefined) area.canonicalUrl = String(canonicalUrl || '').trim();
    if (robots !== undefined) area.robots = String(robots || '').trim();
    if (redirectUrl !== undefined) area.redirectUrl = String(redirectUrl || '').trim();
    if (redirectType !== undefined) area.redirectType = String(redirectType || 'none').trim();
    if (customSchema !== undefined) area.customSchema = String(customSchema || '').trim();

    if (focusKeywords !== undefined) {
      area.focusKeywords = Array.isArray(focusKeywords)
        ? focusKeywords.map((k) => String(k).trim()).filter(Boolean)
        : typeof focusKeywords === 'string'
        ? focusKeywords.split(',').map((k) => k.trim()).filter(Boolean)
        : [];
    }

    if (faqs !== undefined) {
      area.faqs = Array.isArray(faqs)
        ? faqs
            .map((f) => ({
              question: String(f.question || '').trim(),
              answer: String(f.answer || '').trim(),
            }))
            .filter((f) => f.question || f.answer)
        : [];
    }

    if (isActive !== undefined) area.isActive = Boolean(isActive);

    await area.save();

    res.status(200).json({
      success: true,
      message: 'Area updated successfully',
      area,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Soft delete an Area
 * @route   DELETE /api/locations/areas/:id
 * @access  Private/Admin
 */
export const deleteArea = async (req, res) => {
  try {
    const { id } = req.params;

    const area = await Area.findOne({ _id: id, isDeleted: false });
    if (!area) {
      return res.status(404).json({ success: false, message: 'Area not found' });
    }

    area.isDeleted = true;
    area.isActive = false;
    await area.save();

    res.status(200).json({
      success: true,
      message: 'Area soft-deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Toggle Area Active Status
 * @route   PATCH /api/locations/areas/:id/status
 * @access  Private/Admin
 */
export const toggleAreaStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const area = await Area.findOne({ _id: id, isDeleted: false });

    if (!area) {
      return res.status(404).json({ success: false, message: 'Area not found' });
    }

    area.isActive = !area.isActive;
    await area.save();

    res.status(200).json({
      success: true,
      message: `Area ${area.isActive ? 'enabled' : 'disabled'} successfully`,
      isActive: area.isActive,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// LOCATION TREE CONTROLLER
// ==========================================

/**
 * @desc    Get complete location tree (State -> City -> Area) for active locations
 * @route   GET /api/locations/tree
 * @access  Public
 */
export const getLocationTree = async (req, res) => {
  try {
    const states = await State.find({ isDeleted: false, isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    const cities = await City.find({ isDeleted: false, isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    const areas = await Area.find({ isDeleted: false, isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    // Map areas by cityId
    const areaMap = {};
    areas.forEach((area) => {
      const cId = String(area.cityId);
      if (!areaMap[cId]) areaMap[cId] = [];
      areaMap[cId].push(area);
    });

    // Map cities by stateId
    const cityMap = {};
    cities.forEach((city) => {
      const sId = String(city.stateId);
      if (!cityMap[sId]) cityMap[sId] = [];
      city.areas = areaMap[String(city._id)] || [];
      cityMap[sId].push(city);
    });

    // Build hierarchy tree
    const tree = states.map((state) => ({
      ...state,
      cities: cityMap[String(state._id)] || [],
    }));

    res.status(200).json({
      success: true,
      count: tree.length,
      tree,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Auto-register or ensure State, City, and Area exist dynamically in one call
 * @route   POST /api/locations/auto-register
 * @access  Public / App
 */
export const autoRegisterLocation = async (req, res) => {
  try {
    const { stateName, cityName, areaName, pincode } = req.body;
    if (!cityName || !cityName.trim()) {
      return res.status(400).json({ success: false, message: 'City name is required' });
    }

    const cleanState = (stateName || 'Rajasthan').trim();
    const cleanCity = cityName.trim();
    const cleanArea = areaName ? areaName.trim() : '';

    // 1. Ensure State exists
    let state = await State.findOne({
      $or: [{ name: { $regex: new RegExp(`^${cleanState}$`, 'i') } }, { slug: generateSlug(cleanState) }],
      isDeleted: false,
    });

    if (!state) {
      state = await State.create({
        name: cleanState,
        slug: generateSlug(cleanState),
        isActive: true,
      });
    }

    // 2. Ensure City exists under State
    let city = await City.findOne({
      stateId: state._id,
      $or: [{ name: { $regex: new RegExp(`^${cleanCity}$`, 'i') } }, { slug: generateSlug(cleanCity) }],
      isDeleted: false,
    });

    if (!city) {
      city = await City.create({
        name: cleanCity,
        stateId: state._id,
        slug: generateSlug(cleanCity),
        isActive: true,
      });
    }

    // 3. Ensure Area exists under City if areaName provided
    let area = null;
    if (cleanArea) {
      area = await Area.findOne({
        cityId: city._id,
        $or: [{ name: { $regex: new RegExp(`^${cleanArea}$`, 'i') } }, { slug: generateSlug(cleanArea) }],
        isDeleted: false,
      });

      if (!area) {
        area = await Area.create({
          name: cleanArea,
          cityId: city._id,
          stateId: state._id,
          pincode: pincode || '',
          slug: generateSlug(cleanArea),
          isActive: true,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Location hierarchy ensured/registered successfully',
      state,
      city,
      area,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Upload & Optimize Social Preview / SEO Banner Image (1200x630 WebP)
 * @route   POST /api/locations/upload-banner
 * @access  Private/Admin
 */
export const uploadSeoBanner = async (req, res) => {
  try {
    const { image } = req.body;
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ success: false, message: 'Image data URL is required' });
    }

    if (!image.startsWith('data:image/')) {
      if (image.startsWith('http')) {
        return res.status(200).json({ success: true, url: image });
      }
      return res.status(400).json({ success: false, message: 'Invalid image format. Expected data URL.' });
    }

    const parts = image.split(';base64,');
    if (parts.length !== 2) {
      return res.status(400).json({ success: false, message: 'Invalid base64 image data' });
    }

    const buffer = Buffer.from(parts[1], 'base64');
    const hash = crypto.randomBytes(8).toString('hex');
    const filename = `seo_banner_${Date.now()}_${hash}.webp`;
    const filepath = path.join(SEO_UPLOADS_DIR, filename);

    // Resize to recommended Open Graph size 1200x630, webp format, high quality
    await sharp(buffer)
      .resize(1200, 630, { fit: 'cover', position: 'center' })
      .webp({ quality: 85 })
      .toFile(filepath);

    const publicUrl = `${PUBLIC_BASE_URL}/uploads/seo/${filename}`;

    res.status(200).json({
      success: true,
      message: 'Banner uploaded and optimized for Social Sharing (1200x630 WebP)',
      url: publicUrl,
    });
  } catch (err) {
    console.error('Error uploading SEO banner:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

