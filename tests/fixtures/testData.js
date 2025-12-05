/**
 * Test Data Fixtures
 * Sample data for testing
 */

const { ethers } = require('ethers');

// Valid test wallet
const testWallet = new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80');

// Valid waitlist entries
const validWaitlistEntry = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  walletAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  roles: ['developer', 'early_adopter'],
  note: 'Excited to contribute to the project!',
};

const validWaitlistEntry2 = {
  name: 'Jane Smith',
  email: 'jane.smith@example.com',
  walletAddress: null,
  roles: ['investor'],
};

const validWaitlistEntry3 = {
  name: 'Bob Johnson',
  email: 'bob.johnson@example.com',
  walletAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
  roles: ['community_builder', 'other'],
  note: 'Looking forward to building the community',
};

// Invalid entries for validation testing
const invalidEntries = {
  missingName: {
    email: 'test@example.com',
    roles: ['developer'],
  },
  missingEmail: {
    name: 'Test User',
    roles: ['developer'],
  },
  invalidEmail: {
    name: 'Test User',
    email: 'invalid-email',
    roles: ['developer'],
  },
  missingRoles: {
    name: 'Test User',
    email: 'test@example.com',
  },
  emptyRoles: {
    name: 'Test User',
    email: 'test@example.com',
    roles: [],
  },
  invalidRole: {
    name: 'Test User',
    email: 'test@example.com',
    roles: ['invalid_role'],
  },
  invalidWallet: {
    name: 'Test User',
    email: 'test@example.com',
    walletAddress: 'invalid-wallet',
    roles: ['developer'],
  },
  longNote: {
    name: 'Test User',
    email: 'test@example.com',
    roles: ['developer'],
    note: 'a'.repeat(501), // Exceeds 500 char limit
  },
};

/**
 * Generate admin signature for testing
 * @param {string} message - Message to sign
 * @returns {Object} Signature data
 */
async function generateAdminSignature(message = 'Admin authentication') {
  const signature = await testWallet.signMessage(message);
  
  return {
    walletAddress: testWallet.address,
    signature,
    message,
  };
}

/**
 * Generate invalid signature for testing
 * @returns {Object} Invalid signature data
 */
function generateInvalidSignature() {
  return {
    walletAddress: '0x0000000000000000000000000000000000000000',
    signature: '0xinvalidsignature',
    message: 'Invalid',
  };
}

module.exports = {
  testWallet,
  validWaitlistEntry,
  validWaitlistEntry2,
  validWaitlistEntry3,
  invalidEntries,
  generateAdminSignature,
  generateInvalidSignature,
};
