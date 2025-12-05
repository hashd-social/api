/**
 * Waitlist Service
 * Business logic for waitlist operations
 */

const crypto = require('crypto');
const Waitlist = require('../models/Waitlist');

class WaitlistService {
  /**
   * Create a new waitlist entry
   * 
   * @param {Object} data - Waitlist entry data
   * @param {string} data.name - User's name
   * @param {string} data.email - User's email
   * @param {string} [data.walletAddress] - Optional wallet address
   * @param {string[]} data.roles - User's roles
   * @param {string} [data.note] - Optional note
   * @param {string} [data.xHandle] - Optional X handle
   * @returns {Promise<Object>} Created entry with ID
   */
  async createEntry(data) {
    const { name, email, walletAddress, roles, note, xHandle } = data;

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Create new waitlist entry using Mongoose model
    const entry = new Waitlist({
      name,
      email: email.toLowerCase(),
      walletAddress: walletAddress || null,
      roles,
      note: note && note.trim() ? note.trim() : null,
      xHandle: xHandle && xHandle.trim() ? xHandle.trim().toLowerCase() : null,
      emailVerified: false,
      verificationToken,
      status: 'pending',
    });

    // Save to database
    await entry.save();

    return {
      id: entry._id,
      verificationToken,
      email: entry.email,
    };
  }

  /**
   * Find entry by verification token
   * 
   * @param {string} token - Verification token
   * @returns {Promise<Object|null>} Waitlist entry or null
   */
  async findByVerificationToken(token) {
    return await Waitlist.findByVerificationToken(token);
  }

  /**
   * Verify email for an entry
   * 
   * @param {string} token - Verification token
   * @returns {Promise<Object>} Update result
   */
  async verifyEmail(token) {
    const result = await Waitlist.findOneAndUpdate(
      { verificationToken: token },
      {
        emailVerified: true,
        status: 'approved',
        verificationToken: null,
      },
      { new: true }
    );

    return result;
  }

  /**
   * Get paginated waitlist entries with optional filters
   * 
   * @param {Object} options - Query options
   * @param {number} options.page - Page number (1-indexed)
   * @param {number} options.limit - Items per page
   * @param {string} [options.status] - Filter by status
   * @param {string} [options.search] - Search term for name/email
   * @returns {Promise<Object>} Paginated results
   */
  async getEntries({ page = 1, limit = 50, status, search }) {
    return await Waitlist.getPaginated({
      page,
      limit,
      status,
      search,
    });
  }

  /**
   * Update entry status
   * 
   * @param {string} id - Entry ID
   * @param {string} status - New status
   * @returns {Promise<Object>} Update result
   */
  async updateStatus(id, status) {
    const result = await Waitlist.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    return result;
  }

  /**
   * Delete an entry
   * 
   * @param {string} id - Entry ID
   * @returns {Promise<Object>} Delete result
   */
  async deleteEntry(id) {
    return await Waitlist.findByIdAndDelete(id);
  }

  /**
   * Find entry by ID
   * 
   * @param {string} id - Entry ID
   * @returns {Promise<Object|null>} Waitlist entry or null
   */
  async findById(id) {
    return await Waitlist.findById(id);
  }

  /**
   * Get all entries for export
   * 
   * @returns {Promise<Array>} All waitlist entries
   */
  async getAllEntries() {
    return await Waitlist.find({})
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Get statistics
   * 
   * @returns {Promise<Object>} Waitlist statistics
   */
  async getStatistics() {
    return await Waitlist.getStatistics();
  }

  /**
   * Update post status for an entry
   * 
   * @param {string} id - Entry ID
   * @param {string} postUrl - Post URL
   * @returns {Promise<Object>} Update result
   */
  async updatePostStatus(id, postUrl) {
    const result = await Waitlist.findByIdAndUpdate(
      id,
      { 
        posted: true,
        postUrl: postUrl
      },
      { new: true }
    );

    return result;
  }

  /**
   * Find entry by email
   * 
   * @param {string} email - Email address
   * @returns {Promise<Object|null>} Waitlist entry or null
   */
  async findByEmail(email) {
    return await Waitlist.findOne({ email: email.toLowerCase() });
  }

  /**
   * Find entry by post URL
   * 
   * @param {string} postUrl - Post URL
   * @returns {Promise<Object|null>} Waitlist entry or null
   */
  async findByPostUrl(postUrl) {
    return await Waitlist.findOne({ postUrl: postUrl });
  }
}

module.exports = new WaitlistService();
