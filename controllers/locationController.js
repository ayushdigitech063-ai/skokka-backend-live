import State from '../models/State.js';
import City from '../models/City.js';
import Area from '../models/Area.js';
import { generateSlug } from '../utils/slugify.js';

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
    const { name, code, sortOrder, metaTitle, metaDescription, isActive } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'State name is required' });
    }

    const cleanName = name.trim();
    const slug = generateSlug(cleanName);

    // Check duplicate state name or slug among non-deleted states
    const existing = await State.findOne({
      $or: [{ name: { $regex: new RegExp(`^${cleanName}$`, 'i') } }, { slug }],
      isDeleted: false,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `State with name or slug '${cleanName}' already exists`,
      });
    }

    const state = await State.create({
      name: cleanName,
      code: code ? code.trim().toUpperCase() : '',
      slug,
      sortOrder: sortOrder || 0,
      metaTitle: metaTitle || '',
      metaDescription: metaDescription || '',
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

    const query = isObjectId ? { _id: idOrSlug } : { slug: idOrSlug };
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
    const { name, code, sortOrder, metaTitle, metaDescription, isActive } = req.body;

    const state = await State.findOne({ _id: id, isDeleted: false });
    if (!state) {
      return res.status(404).json({ success: false, message: 'State not found' });
    }

    if (name && name.trim() !== state.name) {
      const cleanName = name.trim();
      const newSlug = generateSlug(cleanName);

      const duplicate = await State.findOne({
        _id: { $ne: id },
        $or: [{ name: { $regex: new RegExp(`^${cleanName}$`, 'i') } }, { slug: newSlug }],
        isDeleted: false,
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `State with name '${cleanName}' already exists`,
        });
      }

      state.name = cleanName;
      state.slug = newSlug;
    }

    if (code !== undefined) state.code = code.trim().toUpperCase();
    if (sortOrder !== undefined) state.sortOrder = Number(sortOrder);
    if (metaTitle !== undefined) state.metaTitle = metaTitle;
    if (metaDescription !== undefined) state.metaDescription = metaDescription;
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
    const { name, stateId, tier, isPopular, sortOrder, metaTitle, metaDescription, isActive } = req.body;

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
    const slug = generateSlug(cleanName);

    // Prevent duplicate city in the same state
    const existing = await City.findOne({
      stateId,
      $or: [{ name: { $regex: new RegExp(`^${cleanName}$`, 'i') } }, { slug }],
      isDeleted: false,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `City '${cleanName}' already exists in state '${state.name}'`,
      });
    }

    const city = await City.create({
      name: cleanName,
      stateId,
      slug,
      tier: tier || 'Tier 2',
      isPopular: isPopular !== undefined ? Boolean(isPopular) : false,
      sortOrder: sortOrder || 0,
      metaTitle: metaTitle || '',
      metaDescription: metaDescription || '',
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

    const query = isObjectId ? { _id: idOrSlug } : { slug: idOrSlug };
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
    const { name, stateId, tier, isPopular, sortOrder, metaTitle, metaDescription, isActive } = req.body;

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

    if (name && name.trim() !== city.name) {
      const cleanName = name.trim();
      const newSlug = generateSlug(cleanName);

      const duplicate = await City.findOne({
        _id: { $ne: id },
        stateId: targetStateId,
        $or: [{ name: { $regex: new RegExp(`^${cleanName}$`, 'i') } }, { slug: newSlug }],
        isDeleted: false,
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `City with name '${cleanName}' already exists in this state`,
        });
      }

      city.name = cleanName;
      city.slug = newSlug;
    }

    if (tier !== undefined) city.tier = tier;
    if (isPopular !== undefined) city.isPopular = Boolean(isPopular);
    if (sortOrder !== undefined) city.sortOrder = Number(sortOrder);
    if (metaTitle !== undefined) city.metaTitle = metaTitle;
    if (metaDescription !== undefined) city.metaDescription = metaDescription;
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
    const { name, cityId, pincode, isPopular, sortOrder, isActive } = req.body;

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
    const slug = generateSlug(cleanName);

    // Prevent duplicate area in the same city
    const existing = await Area.findOne({
      cityId,
      $or: [{ name: { $regex: new RegExp(`^${cleanName}$`, 'i') } }, { slug }],
      isDeleted: false,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Area '${cleanName}' already exists in city '${city.name}'`,
      });
    }

    const area = await Area.create({
      name: cleanName,
      cityId,
      stateId: city.stateId, // derive stateId automatically from City
      pincode: pincode ? pincode.trim() : '',
      slug,
      isPopular: isPopular !== undefined ? Boolean(isPopular) : false,
      sortOrder: sortOrder || 0,
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

    const query = isObjectId ? { _id: idOrSlug } : { slug: idOrSlug };
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
    const { name, cityId, pincode, isPopular, sortOrder, isActive } = req.body;

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

    if (name && name.trim() !== area.name) {
      const cleanName = name.trim();
      const newSlug = generateSlug(cleanName);

      const duplicate = await Area.findOne({
        _id: { $ne: id },
        cityId: targetCityId,
        $or: [{ name: { $regex: new RegExp(`^${cleanName}$`, 'i') } }, { slug: newSlug }],
        isDeleted: false,
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `Area with name '${cleanName}' already exists in this city`,
        });
      }

      area.name = cleanName;
      area.slug = newSlug;
    }

    if (pincode !== undefined) area.pincode = pincode.trim();
    if (isPopular !== undefined) area.isPopular = Boolean(isPopular);
    if (sortOrder !== undefined) area.sortOrder = Number(sortOrder);
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
