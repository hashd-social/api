/**
 * Jest Configuration
 * Test suite configuration for Hashd Waitlist API
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js', // Exclude server entry point
    '!**/node_modules/**',
  ],

  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],

  // Test match patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js',
  ],

  // Global setup - runs once before all tests
  globalSetup: '<rootDir>/tests/jest.globalSetup.js',

  // Setup files - runs before each test file
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setupFilesAfterEnv.js'],

  // Timeout
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
