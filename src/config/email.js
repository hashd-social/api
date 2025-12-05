/**
 * Email Service Configuration
 * Handles Resend email service initialization
 */

const { Resend } = require('resend');

class EmailService {
  constructor() {
    this.resend = null;
    this.isConfigured = false;
  }

  /**
   * Initialize Resend email service
   * @returns {boolean} - Whether service was successfully configured
   */
  initialize() {
    const apiKey = process.env.RESEND_API_KEY;
    
    if (!apiKey) {
      console.warn('⚠️  RESEND_API_KEY not set. Email sending will be disabled.');
      return false;
    }

    try {
      this.resend = new Resend(apiKey);
      this.isConfigured = true;
      console.log('✅ Resend email service configured');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Resend:', error);
      return false;
    }
  }

  /**
   * Get Resend instance
   * @returns {Resend|null}
   */
  getResend() {
    return this.resend;
  }

  /**
   * Check if email service is configured
   * @returns {boolean}
   */
  isReady() {
    return this.isConfigured;
  }
}

// Export singleton instance
module.exports = new EmailService();
