import express from 'express';
import {
  getPublicEscorts,
  getAllEscortsAdmin,
  getEscortById,
  createEscort,
  updateEscort,
  setEscortStatus,
  setEscortPlacement,
  deleteEscort,
  seedDefaultProfiles,
} from '../controllers/escortController.js';

const router = express.Router();

// ── PUBLIC ROUTES ─────────────────────────────────────────
// GET /api/escorts           → All APPROVED profiles (homepage / escorts page)
// GET /api/escorts/:id       → Single profile
router.get('/', getPublicEscorts);
router.get('/admin/all', getAllEscortsAdmin);
router.get('/admin', getAllEscortsAdmin);          // ALL profiles (admin panel)
router.post('/seed', seedDefaultProfiles);         // Seed demo data (run once)
router.get('/:id', getEscortById);

// ── ADMIN ROUTES ──────────────────────────────────────────
router.post('/', createEscort);                              // Create listing
router.put('/:id', updateEscort);                            // Edit listing
router.patch('/:id/status', setEscortStatus);                // Approve / Reject
router.patch('/:id/placement', setEscortPlacement);          // VIP / Verified / Standard
router.delete('/:id', deleteEscort);                         // Delete listing

export default router;
