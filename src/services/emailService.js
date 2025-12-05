/**
 * Email Service
 * Handles email template generation and sending
 */

const emailConfig = require('../config/email');

class EmailTemplateService {
  /**
   * Generate verification email HTML
   * 
   * @param {string} verificationUrl - URL for email verification
   * @param {string} name - Recipient name
   * @returns {string} HTML email template
   */
  generateVerificationEmail(verificationUrl, name = 'THERE') {
    const frontendUrl = process.env.FRONTEND_URL;
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - HASHD</title>
        <style>
          a { color: #00ffff !important; text-decoration: none; }
          a:visited { color: #00ffff !important; }
          @media only screen and (max-width: 600px) {
            .mobile-padding { padding: 30px 20px !important; }
            .mobile-text { font-size: 18px !important; line-height: 1.6 !important; }
            .mobile-title { font-size: 32px !important; }
            .mobile-button { padding: 20px 40px !important; font-size: 18px !important; }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Courier New', monospace; background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%);">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%); min-height: 100vh;">
          <tr>
            <td align="center" style="padding: 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 100%; background: linear-gradient(135deg, #0f1629 0%, #1a1f3a 100%);">
                
                <!-- Logo Header -->
                <tr>
                  <td align="center" class="mobile-padding" style="padding: 50px 40px 30px 40px; background: linear-gradient(90deg, rgba(0, 255, 255, 0.1) 0%, transparent 100%);">
                    <img src="${frontendUrl}/logo.png" alt="HASHD" width="160" height="auto" style="display: block; width: 160px; height: auto; margin: 0 auto; max-width: 80%;">
                  </td>
                </tr>
                
                <!-- Main Content -->
                <tr>
                  <td class="mobile-padding" style="padding: 40px 40px 50px 40px;">
                    <h1 class="mobile-title" style="color: #00ffff; font-size: 36px; font-weight: 700; margin: 0 0 30px 0; text-align: center; text-shadow: 0 0 20px rgba(0, 255, 255, 0.6); letter-spacing: 2px; text-transform: uppercase;">
                      WELCOME, ${name.toUpperCase()}
                    </h1>
                    
                    <p class="mobile-text" style="color: #ffffff; font-size: 18px; line-height: 1.7; margin: 0 0 20px 0; text-align: center;">
                      You're on the HASHD waitlist. We're building the future of <span style="color: #00ffff; font-weight: bold;">decentralized communication</span> on MegaETH.
                    </p>
                    
                    <p class="mobile-text" style="color: #ffffff; font-size: 18px; line-height: 1.7; margin: 0 0 40px 0; text-align: center;">
                      Verify your email to secure your spot:
                    </p>
                    
                    <!-- CTA Button -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" style="padding: 0 0 40px 0;">
                          <a href="${verificationUrl}" class="mobile-button" style="display: inline-block; padding: 22px 60px; background: linear-gradient(135deg, rgba(0, 255, 255, 0.25) 0%, rgba(0, 255, 255, 0.15) 100%); border: 2px solid #00ffff; color: #00ffff !important; text-decoration: none; font-weight: 700; font-size: 18px; border-radius: 8px; box-shadow: 0 0 30px rgba(0, 255, 255, 0.4); letter-spacing: 2px; text-transform: uppercase;">
                            VERIFY EMAIL
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Benefits Box -->
                    <div style="background: rgba(0, 255, 255, 0.05); padding: 30px; margin: 0 0 30px 0;">
                      <p class="mobile-text" style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #00ffff; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);">
                        ONCE VERIFIED:
                      </p>
                      <p class="mobile-text" style="margin: 0 0 12px 0; font-size: 16px; line-height: 1.6; color: #ffffff;">
                        <span style="color: #00ffff; margin-right: 8px;">✓</span> Early access to the beta test site
                      </p>
                      <p class="mobile-text" style="margin: 0 0 12px 0; font-size: 16px; line-height: 1.6; color: #ffffff;">
                        <span style="color: #00ffff; margin-right: 8px;">✓</span> Priority HashdTag registration
                      </p>
                      <p class="mobile-text" style="margin: 0; font-size: 16px; line-height: 1.6; color: #ffffff;">
                        <span style="color: #00ffff; margin-right: 8px;">✓</span> Consideration for the official token airdrop
                      </p>
                    </div>
                    
                    <p class="mobile-text" style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 30px 0 10px 0; text-align: center; text-transform: uppercase; letter-spacing: 1px;">
                      Or copy this link:
                    </p>
                    <div style="background: rgba(0, 255, 255, 0.05); padding: 20px; border-radius: 6px; margin: 0 0 30px 0;">
                      <a href="${verificationUrl}" class="mobile-text" style="color: #00ffff !important; word-break: break-all; font-size: 14px; line-height: 1.6; display: block; text-align: center;">${verificationUrl}</a>
                    </div>
                    
                    <p class="mobile-text" style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0; text-align: center;">
                      Stay tuned for updates.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td class="mobile-padding" style="padding: 40px; background: rgba(0, 0, 0, 0.4);">
                    <p style="margin: 0 0 15px 0; font-size: 15px; line-height: 1.6; color: #94a3b8; text-align: center; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                      HASHD — STAY.UNCENSORED
                    </p>
                    <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #64748b; text-align: center;">
                      <a href="https://x.com/hashdsocial" style="color: #00ffff !important; text-decoration: none; font-weight: 700;">X</a>
                      <span style="color: #475569; margin: 0 10px;">|</span>
                      <a href="https://t.me/hashdsocial" style="color: #00ffff !important; text-decoration: none; font-weight: 700;">Telegram</a>
                    </p>
                  </td>
                </tr>
                
                <!-- Legal -->
                <tr>
                  <td style="padding: 30px 40px; text-align: center;">
                    <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #64748b;">
                      You received this email because you signed up for the HASHD waitlist.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  /**
   * Send verification email
   * 
   * @param {string} email - Recipient email address
   * @param {string} verificationToken - Verification token
   * @param {string} name - Recipient name
   * @returns {Promise<Object>} Send result
   */
  async sendVerificationEmail(email, verificationToken, name = 'THERE') {
    // In test mode, return mock success without actually sending
    if (process.env.NODE_ENV === 'test') {
      return {
        id: `test-email-${Date.now()}`,
        from: 'test@hashd.social',
        to: email,
        created_at: new Date().toISOString(),
      };
    }

    const resend = emailConfig.getResend();
    
    if (!resend) {
      throw new Error('Email service not configured');
    }

    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    const html = this.generateVerificationEmail(verificationUrl, name);

    console.log(`📧 Sending verification email to: ${email}`);

    const result = await resend.emails.send({
      from: 'HASHD <support@hashd.social>',
      to: email,
      subject: 'Verify Your Email - HASHD Waitlist',
      html,
    });

    if (process.env.NODE_ENV !== 'test') {
      console.log(`✅ Verification email sent to: ${email}`);
    }
    
    return result;
  }

  /**
   * Resend verification email
   * 
   * @param {string} email - Recipient email address
   * @param {string} verificationToken - Verification token
   * @param {string} name - Recipient name
   * @returns {Promise<Object>} Send result
   */
  async resendVerificationEmail(email, verificationToken, name = 'THERE') {
    if (process.env.NODE_ENV !== 'test') {
      console.log(`🔄 Resending verification email to: ${email}`);
    }
    return await this.sendVerificationEmail(email, verificationToken, name);
  }
}

module.exports = new EmailTemplateService();
