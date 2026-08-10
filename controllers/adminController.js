import {
  createAdminService,
  getAllAdminsService,
  getAdminByIdService,
  updateAdminService,
  deleteAdminService,
  toggleAdminStatusService,
} from '../services/adminService.js';

// @desc    Create New Admin (Super Admin Only)
// @route   POST /api/admins
// @access  Private/SuperAdmin
export const createAdmin = async (req, res) => {
  try {
    const admin = await createAdminService(req.body, req.admin.id);
    return res.status(201).json({
      success: true,
      message: 'Admin account created successfully.',
      data: admin,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to create admin.',
    });
  }
};

// @desc    Get All Admins List (Super Admin Only)
// @route   GET /api/admins
// @access  Private/SuperAdmin
export const getAllAdmins = async (req, res) => {
  try {
    const admins = await getAllAdminsService();
    return res.status(200).json({
      success: true,
      count: admins.length,
      data: admins,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch admins.',
    });
  }
};

// @desc    Get Single Admin Details
// @route   GET /api/admins/:id
// @access  Private/SuperAdmin
export const getAdminById = async (req, res) => {
  try {
    const admin = await getAdminByIdService(req.params.id);
    return res.status(200).json({
      success: true,
      data: admin,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update Admin Profile & Permissions
// @route   PUT /api/admins/:id
// @access  Private/SuperAdmin
export const updateAdmin = async (req, res) => {
  try {
    const admin = await updateAdminService(req.params.id, req.body);
    return res.status(200).json({
      success: true,
      message: 'Admin updated successfully.',
      data: admin,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete Admin
// @route   DELETE /api/admins/:id
// @access  Private/SuperAdmin
export const deleteAdmin = async (req, res) => {
  try {
    await deleteAdminService(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Admin deleted successfully.',
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Enable/Disable Admin Status
// @route   PATCH /api/admins/:id/toggle-status
// @access  Private/SuperAdmin
export const toggleAdminStatus = async (req, res) => {
  try {
    const admin = await toggleAdminStatusService(req.params.id);
    return res.status(200).json({
      success: true,
      message: `Admin status toggled to ${admin.isActive ? 'Active' : 'Disabled'}.`,
      data: admin,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
