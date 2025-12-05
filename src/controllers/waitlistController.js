/**
 * Waitlist Controller
 * Handles HTTP requests for waitlist operations
 */

const waitlistService = require('../services/waitlistService');
const emailService = require('../services/emailService');
const { ObjectId } = require('mongodb');

class WaitlistController {
  /**
   * Submit waitlist entry
   * POST /api/waitlist
   */
  async submit(req, res) {
    try {
      const { name, email, walletAddress, roles, note, xHandle } = req.body;

      // Create waitlist entry
      const result = await waitlistService.createEntry({
        name,
        email,
        walletAddress,
        roles,
        note,
        xHandle,
      });

      // Send verification email (non-blocking)
      emailService.sendVerificationEmail(result.email, result.verificationToken, name)
        .catch(error => {
          console.error('Failed to send verification email:', error);
        });

      if (process.env.NODE_ENV !== 'test') {
        console.log(`✅ New waitlist entry: ${email}`);
      }

      res.status(201).json({ 
        success: true, 
        message: 'Successfully joined the waitlist. Please check your email to verify your address.',
        id: result.id,
      });

    } catch (error) {
      console.error('Waitlist submission error:', error);
      
      // Handle duplicate email
      if (error.code === 11000) {
        return res.status(409).json({ 
          success: false, 
          message: 'This email is already on the waitlist' 
        });
      }

      res.status(500).json({ 
        success: false, 
        message: 'Failed to join waitlist. Please try again.' 
      });
    }
  }

  /**
   * Verify email with token
   * GET /api/verify-email/:token
   */
  async verifyEmail(req, res) {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({ 
          success: false, 
          message: 'Verification token is required' 
        });
      }

      // Find entry by token
      const entry = await waitlistService.findByVerificationToken(token);

      if (!entry) {
        return res.status(404).json({ 
          success: false, 
          message: 'Invalid or expired verification token' 
        });
      }

      // Check if already verified
      if (entry.emailVerified) {
        return res.status(200).json({ 
          success: true, 
          message: 'Email already verified',
          alreadyVerified: true,
        });
      }

      // Verify email
      await waitlistService.verifyEmail(token);

      if (process.env.NODE_ENV !== 'test') {
        console.log(`✅ Email verified: ${entry.email}`);
      }

      res.status(200).json({ 
        success: true, 
        message: 'Email verified successfully! Welcome to the HASHD waitlist.',
        email: entry.email,
        userId: entry._id,
      });

    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to verify email. Please try again.' 
      });
    }
  }

  /**
   * Save post URL without verification
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async savePost(req, res) {
    try {
      const { userId, postUrl } = req.body;

      if (!userId || !postUrl) {
        return res.status(400).json({
          success: false,
          message: 'User ID and post URL are required'
        });
      }

      // Validate and sanitize post URL format
      const postUrlRegex = /^https:\/\/(twitter\.com|x\.com)\/(\w+)\/status\/(\d+)/;
      const match = postUrl.match(postUrlRegex);
      if (!match) {
        return res.status(400).json({
          success: false,
          message: 'Invalid X post URL format'
        });
      }

      // Sanitize URL by removing query parameters and fragments
      const [, domain, username, tweetId] = match;
      const sanitizedPostUrl = `https://${domain}/${username}/status/${tweetId}`;
      
      console.log('💾 Saving post URL:', { original: postUrl, sanitized: sanitizedPostUrl });

      // Find the waitlist entry by ID
      const entry = await waitlistService.findById(userId);
      if (!entry) {
        return res.status(404).json({
          success: false,
          message: 'Waitlist entry not found'
        });
      }

      // Check if email is verified
      if (!entry.emailVerified) {
        return res.status(400).json({
          success: false,
          message: 'Please verify your email first'
        });
      }

      // Check if this post URL has already been used by another user
      const existingPost = await waitlistService.findByPostUrl(sanitizedPostUrl);
      if (existingPost && existingPost._id.toString() !== userId) {
        return res.status(400).json({
          success: false,
          message: 'This post has already been used by another user. Please create a new post.'
        });
      }

      // Save the post URL
      await waitlistService.updatePostStatus(entry._id, sanitizedPostUrl);

      console.log(`💾 Post URL saved for: ${entry.email}`);

      res.json({
        success: true,
        message: 'Post URL saved successfully! We will verify it automatically nearer to launch.'
      });

    } catch (error) {
      console.error('Save post error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save post URL. Please try again.'
      });
    }
  }

  /**
   * Verify post content (placeholder for future implementation)
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async verifyPost(req, res) {
    // This endpoint is deprecated - verification will be handled automatically
    res.status(410).json({
      success: false,
      message: 'Post verification is now handled automatically. Please use the save-post endpoint instead.'
    });
  }
}

module.exports = new WaitlistController();
