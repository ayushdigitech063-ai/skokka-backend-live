import express from 'express';
import {
  // State Controllers
  createState,
  getStates,
  getStateById,
  updateState,
  deleteState,
  toggleStateStatus,
  // City Controllers
  createCity,
  getCities,
  getCityById,
  updateCity,
  deleteCity,
  toggleCityStatus,
  // Area Controllers
  createArea,
  getAreas,
  getAreaById,
  updateArea,
  deleteArea,
  toggleAreaStatus,
  // Tree Controller
  getLocationTree,
  autoRegisterLocation,
} from '../controllers/locationController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

// ==========================================
// PUBLIC ROUTES
// ==========================================
router.get('/tree', getLocationTree);
router.post('/auto-register', autoRegisterLocation);

// Public State Routes
router.get('/states', getStates);
router.get('/states/:idOrSlug', getStateById);

// Public City Routes
router.get('/cities', getCities);
router.get('/cities/:idOrSlug', getCityById);

// Public Area Routes
router.get('/areas', getAreas);
router.get('/areas/:idOrSlug', getAreaById);

// ==========================================
// PROTECTED SUPER ADMIN ROUTES
// ==========================================

// State Admin Routes
router.post('/states', protect, authorizeRoles('super_admin', 'admin'), createState);
router.put('/states/:id', protect, authorizeRoles('super_admin', 'admin'), updateState);
router.delete('/states/:id', protect, authorizeRoles('super_admin', 'admin'), deleteState);
router.patch('/states/:id/status', protect, authorizeRoles('super_admin', 'admin'), toggleStateStatus);

// City Admin Routes
router.post('/cities', protect, authorizeRoles('super_admin', 'admin'), createCity);
router.put('/cities/:id', protect, authorizeRoles('super_admin', 'admin'), updateCity);
router.delete('/cities/:id', protect, authorizeRoles('super_admin', 'admin'), deleteCity);
router.patch('/cities/:id/status', protect, authorizeRoles('super_admin', 'admin'), toggleCityStatus);

// Area Admin Routes
router.post('/areas', protect, authorizeRoles('super_admin', 'admin'), createArea);
router.put('/areas/:id', protect, authorizeRoles('super_admin', 'admin'), updateArea);
router.delete('/areas/:id', protect, authorizeRoles('super_admin', 'admin'), deleteArea);
router.patch('/areas/:id/status', protect, authorizeRoles('super_admin', 'admin'), toggleAreaStatus);

export default router;
