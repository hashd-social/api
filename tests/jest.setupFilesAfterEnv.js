/**
 * Test Setup
 * Global test configuration and utilities
 */

// Load environment variables from .env file
require('dotenv').config();

// CRITICAL: Force test environment and test database
process.env.NODE_ENV = 'test';
process.env.PORT = '3003';
process.env.MONGODB_DB_NAME = 'hashd-test';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';

// Test-only configuration
process.env.ADMIN_WALLET_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.RESEND_API_KEY = 'test_key';

// Only log database info if not in silent mode
if (process.env.SILENT_TESTS !== 'true') {
  console.log('🧪 Running tests against database:', process.env.MONGODB_DB_NAME);
  console.log('🔒 Tests isolated from production database');
}

// Increase timeout for database operations
jest.setTimeout(10000);

// Suppress noisy console output during tests
// Keep errors for actual test failures, but suppress expected errors
const originalError = console.error;
console.error = (...args) => {
  const message = args[0]?.toString() || '';
  
  // Suppress expected test errors
  if (
    message.includes('Email service not configured') ||
    message.includes('Signature verification error') ||
    message.includes('Waitlist submission error') ||
    message.includes('Failed to send verification email') ||
    message.includes('Resend verification error') ||
    message.includes('E11000 duplicate key error')
  ) {
    return; // Suppress these expected errors
  }
  
  // Log other errors normally
  originalError.apply(console, args);
};

// Suppress all console logs in silent mode
if (process.env.SILENT_TESTS === 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  };
}
