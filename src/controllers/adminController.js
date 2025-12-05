/**
 * Admin Controller
 * Handles HTTP requests for admin operations
 */

const waitlistService = require('../services/waitlistService');
const emailService = require('../services/emailService');
const crypto = require('crypto');

class AdminController {
  /**
   * Get all waitlist entries with pagination
   * POST /api/admin/waitlist
   */
  async getEntries(req, res) {
    try {
      const { page = 1, limit = 50, status, search } = req.body;

      const result = await waitlistService.getEntries({
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        search,
      });

      res.status(200).json({ 
        success: true, 
        ...result,
      });

    } catch (error) {
      console.error('Get waitlist entries error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch waitlist entries' 
      });
    }
  }

  /**
   * Update entry status
   * POST /api/admin/waitlist/:id/status
   */
  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // Check if entry exists
      const entry = await waitlistService.findById(id);
      
      if (!entry) {
        return res.status(404).json({ 
          success: false, 
          message: 'Waitlist entry not found' 
        });
      }

      // Update status
      const result = await waitlistService.updateStatus(id, status);

      if (!result) {
        return res.status(400).json({ 
          success: false, 
          message: 'Failed to update status' 
        });
      }

      if (process.env.NODE_ENV !== 'test') {
        console.log(`✅ Updated status for ${entry.email} to ${status}`);
      }

      res.status(200).json({ 
        success: true, 
        message: 'Status updated successfully' 
      });

    } catch (error) {
      console.error('Update status error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update status' 
      });
    }
  }

  /**
   * Delete entry
   * POST /api/admin/waitlist/:id/delete
   */
  async deleteEntry(req, res) {
    try {
      const { id } = req.params;

      // Check if entry exists
      const entry = await waitlistService.findById(id);
      
      if (!entry) {
        return res.status(404).json({ 
          success: false, 
          message: 'Waitlist entry not found' 
        });
      }

      // Delete entry
      const result = await waitlistService.deleteEntry(id);

      if (!result) {
        return res.status(400).json({ 
          success: false, 
          message: 'Failed to delete entry' 
        });
      }

      if (process.env.NODE_ENV !== 'test') {
        console.log(`✅ Deleted entry: ${entry.email}`);
      }

      res.status(200).json({ 
        success: true, 
        message: 'Entry deleted successfully' 
      });

    } catch (error) {
      console.error('Delete entry error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to delete entry' 
      });
    }
  }

  /**
   * Resend verification email
   * POST /api/admin/waitlist/:id/resend-verification
   */
  async resendVerification(req, res) {
    try {
      const { id } = req.params;

      // Find entry
      const entry = await waitlistService.findById(id);
      
      if (!entry) {
        return res.status(404).json({ 
          success: false, 
          message: 'Waitlist entry not found' 
        });
      }

      // Check if already verified
      if (entry.emailVerified) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email is already verified' 
        });
      }

      // Generate new verification token if needed
      let verificationToken = entry.verificationToken;
      
      if (!verificationToken) {
        verificationToken = crypto.randomBytes(32).toString('hex');
        
        // Update entry with new token
        entry.verificationToken = verificationToken;
        await entry.save();
      }

      // Send verification email
      await emailService.resendVerificationEmail(entry.email, verificationToken, entry.name);

      if (process.env.NODE_ENV !== 'test') {
        console.log(`✅ Resent verification email to: ${entry.email}`);
      }

      res.status(200).json({ 
        success: true, 
        message: 'Verification email sent successfully' 
      });

    } catch (error) {
      console.error('Resend verification error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send verification email' 
      });
    }
  }

  /**
   * Export waitlist to CSV
   * POST /api/admin/waitlist/export
   */
  async exportCSV(req, res) {
    try {
      const entries = await waitlistService.getAllEntries();

      // Generate CSV
      const csvHeader = 'Name,Email,Wallet Address,Roles,Status,Email Verified,Created At\n';
      const csvRows = entries.map(entry => {
        const roles = entry.roles.join(';');
        const createdAt = entry.createdAt.toISOString();
        return `"${entry.name}","${entry.email}","${entry.walletAddress || ''}","${roles}","${entry.status}","${entry.emailVerified}","${createdAt}"`;
      }).join('\n');

      const csv = csvHeader + csvRows;

      // Set headers for file download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="hashd-waitlist-${Date.now()}.csv"`);

      if (process.env.NODE_ENV !== 'test') {
        console.log(`✅ Exported ${entries.length} waitlist entries to CSV`);
      }

      res.status(200).send(csv);

    } catch (error) {
      console.error('Export CSV error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to export waitlist' 
      });
    }
  }

  /**
   * Get waitlist statistics
   * GET /api/admin/stats
   */
  async getStatistics(req, res) {
    try {
      const stats = await waitlistService.getStatistics();

      res.status(200).json({ 
        success: true, 
        stats,
      });

    } catch (error) {
      console.error('Get statistics error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch statistics' 
      });
    }
  }
}

module.exports = new AdminController();
