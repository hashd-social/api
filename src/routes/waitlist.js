/**
 * Waitlist Routes
 * Public endpoints for waitlist operations
 */

const express = require('express');
const router = express.Router();
const waitlistController = require('../controllers/waitlistController');
const { validateWaitlistSubmission } = require('../middleware/validation');
const { waitlistLimiter, verifyEmailLimiter } = require('../config/rateLimits');

/**
 * @route   POST /api/waitlist
 * @desc    Submit waitlist entry
 * @access  Public (rate limited)
 */
router.post(
  '/',
  waitlistLimiter,
  validateWaitlistSubmission,
  waitlistController.submit
);

/**
 * @route   GET /api/verify-email/:token
 * @desc    Verify email with token
 * @access  Public (rate limited)
 */
router.get(
  '/verify-email/:token',
  verifyEmailLimiter,
  waitlistController.verifyEmail
);

/**
 * @route   POST /api/waitlist/save-post
 * @desc    Save post URL for future verification
 * @access  Public (rate limited)
 */
router.post(
  '/save-post',
  waitlistLimiter,
  waitlistController.savePost
);

/**
 * @route   POST /api/waitlist/verify-post
 * @desc    Deprecated - Post verification is now handled automatically
 * @access  Public (deprecated)
 */
router.post('/verify-post', waitlistController.verifyPost);

module.exports = router;
