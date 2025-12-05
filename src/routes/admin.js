/**
 * Admin Routes
 * Protected endpoints for admin operations
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyWalletSignature } = require('../middleware/auth');
const { validateStatusUpdate } = require('../middleware/validation');
const { adminLimiter } = require('../config/rateLimits');

// Apply rate limiter and auth to all admin routes
router.use(adminLimiter);
router.use(verifyWalletSignature);

/**
 * @route   POST /api/admin/waitlist
 * @desc    Get all waitlist entries with pagination
 * @access  Admin only
 */
router.post('/waitlist', adminController.getEntries);

/**
 * @route   POST /api/admin/waitlist/:id/status
 * @desc    Update entry status
 * @access  Admin only
 */
router.post(
  '/waitlist/:id/status',
  validateStatusUpdate,
  adminController.updateStatus
);

/**
 * @route   POST /api/admin/waitlist/:id/delete
 * @desc    Delete entry
 * @access  Admin only
 */
router.post('/waitlist/:id/delete', adminController.deleteEntry);

/**
 * @route   POST /api/admin/waitlist/:id/resend-verification
 * @desc    Resend verification email
 * @access  Admin only
 */
router.post('/waitlist/:id/resend-verification', adminController.resendVerification);

/**
 * @route   POST /api/admin/waitlist/export
 * @desc    Export waitlist to CSV
 * @access  Admin only
 */
router.post('/waitlist/export', adminController.exportCSV);

/**
 * @route   GET /api/admin/stats
 * @desc    Get waitlist statistics
 * @access  Admin only
 */
router.get('/stats', adminController.getStatistics);

module.exports = router;
