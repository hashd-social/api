/**
 * Validation Middleware
 * Handles input validation for API requests
 */

const { ethers } = require('ethers');

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate waitlist submission data
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Next middleware function
 */
function validateWaitlistSubmission(req, res, next) {
  const { name, email, walletAddress, roles, note } = req.body;

  // Required fields
  if (!name || !email || !roles || roles.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: 'Missing required fields: name, email, and roles are required' 
    });
  }

  // Note length validation (if provided)
  if (note && note.length > 500) {
    return res.status(400).json({ 
      success: false, 
      message: 'Note cannot exceed 500 characters' 
    });
  }

  // Email format
  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid email address format' 
    });
  }

  // Wallet address format (if provided)
  if (walletAddress && !ethers.isAddress(walletAddress)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid wallet address format' 
    });
  }

  // Roles validation
  const validRoles = ['developer', 'community_builder', 'investor', 'content_creator', 'early_adopter', 'other'];
  const invalidRoles = roles.filter(role => !validRoles.includes(role));
  
  if (invalidRoles.length > 0) {
    return res.status(400).json({ 
      success: false, 
      message: `Invalid roles: ${invalidRoles.join(', ')}` 
    });
  }

  next();
}

/**
 * Validate status update data
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Next middleware function
 */
function validateStatusUpdate(req, res, next) {
  const { status } = req.body;
  const validStatuses = ['pending', 'approved', 'rejected'];

  if (!status) {
    return res.status(400).json({ 
      success: false, 
      message: 'Status is required' 
    });
  }

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ 
      success: false, 
      message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
    });
  }

  next();
}

module.exports = {
  validateWaitlistSubmission,
  validateStatusUpdate,
};
