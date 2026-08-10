import express from 'express';
import { body, validationResult } from 'express-validator';
import {
  createAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
  toggleAdminStatus,
} from '../controllers/adminController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Middleware to handle Express-Validator errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map((err) => ({ field: err.param, message: err.msg })),
    });
  }
  next();
};

// All routes here require Authentication & Super Admin Role
router.use(protect);
router.use(authorizeRoles('super_admin'));

router
  .route('/')
  .get(getAllAdmins)
  .post(
    [
      body('fullName').notEmpty().withMessage('Full Name is required'),
      body('email').isEmail().withMessage('Please provide a valid email'),
      body('mobile').notEmpty().withMessage('Mobile number is required'),
      body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),
      body('confirmPassword').custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Confirm password does not match password');
        }
        return true;
      }),
    ],
    validate,
    createAdmin
  );

router
  .route('/:id')
  .get(getAdminById)
  .put(updateAdmin)
  .delete(deleteAdmin);

router.patch('/:id/toggle-status', toggleAdminStatus);

export default router;
