/**
 * Authentication Middleware
 * Handles wallet signature verification for admin endpoints
 */

const { ethers } = require('ethers');

/**
 * Verify wallet signature middleware
 * Ensures requests are signed by the admin wallet
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Next middleware function
 */
async function verifyWalletSignature(req, res, next) {
  try {
    const { walletAddress, signature, message } = req.body;
    
    // Validate required fields
    if (!walletAddress || !signature || !message) {
      return res.status(401).json({ 
        success: false, 
        message: 'Missing authentication credentials' 
      });
    }

    // Verify the signature
    const recoveredAddress = ethers.verifyMessage(message, signature);
    
    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid signature' 
      });
    }

    // Check if wallet is admin
    const adminWallet = process.env.ADMIN_WALLET_ADDRESS?.toLowerCase();
    
    if (!adminWallet) {
      return res.status(500).json({ 
        success: false, 
        message: 'Admin wallet not configured' 
      });
    }

    if (walletAddress.toLowerCase() !== adminWallet) {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized: Admin access required' 
      });
    }

    // Attach wallet address to request for use in controllers
    req.adminWallet = walletAddress.toLowerCase();
    
    next();
  } catch (error) {
    console.error('Signature verification error:', error);
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication failed' 
    });
  }
}

module.exports = {
  verifyWalletSignature,
};
