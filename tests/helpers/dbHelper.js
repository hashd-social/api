/**
 * Database Test Helper
 * Utilities for database operations in tests
 */

const mongoose = require('mongoose');
const Waitlist = require('../../src/models/Waitlist');

/**
 * Connect to test database
 * SAFETY: Only uses MONGODB_TEST_DB_NAME, never touches production
 */
async function connectTestDB() {
  const uri = process.env.MONGODB_URI;
  // Use hashd-test for all tests - simple and consistent
  const testDbName = 'hashd-test';

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri, { dbName: testDbName });
    if (process.env.SILENT_TESTS !== 'true') {
      console.log(`✅ Connected to TEST database: ${testDbName}`);
    }
  }
}

/**
 * Disconnect from test database
 */
async function disconnectTestDB() {
  await mongoose.connection.close();
}

/**
 * Clear all collections
 * SAFETY: Only clears test database collections
 */
async function clearDatabase() {
  const dbName = mongoose.connection.db.databaseName;
  const testDbName = process.env.MONGODB_TEST_DB_NAME || 'hashd-test';
  
  // CRITICAL SAFETY CHECK: Ensure we're clearing test database only
  if (dbName !== testDbName) {
    throw new Error(
      `❌ CRITICAL: Attempting to clear non-test database: ${dbName}\n` +
      `Expected test database: ${testDbName}\n` +
      `This operation is BLOCKED to protect production data.`
    );
  }

  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

/**
 * Drop test database
 * SAFETY: Only drops test database, never production
 */
async function dropDatabase() {
  const dbName = mongoose.connection.db.databaseName;
  const testDbName = process.env.MONGODB_TEST_DB_NAME || 'hashd-test';
  
  // CRITICAL SAFETY CHECK: Ensure we're dropping test database only
  if (dbName !== testDbName) {
    throw new Error(
      `❌ CRITICAL: Attempting to drop non-test database: ${dbName}\n` +
      `Expected test database: ${testDbName}\n` +
      `This operation is BLOCKED to protect production data.`
    );
  }

  await mongoose.connection.dropDatabase();
  console.log(`✅ Dropped TEST database: ${dbName}`);
}

/**
 * Create a test waitlist entry
 * @param {Object} data - Entry data
 * @returns {Promise<Document>} Created entry
 */
async function createTestEntry(data) {
  const entry = new Waitlist(data);
  return await entry.save();
}

/**
 * Create multiple test entries
 * @param {Array} entries - Array of entry data
 * @returns {Promise<Array>} Created entries
 */
async function createTestEntries(entries) {
  return await Waitlist.insertMany(entries);
}

module.exports = {
  connectTestDB,
  disconnectTestDB,
  clearDatabase,
  dropDatabase,
  createTestEntry,
  createTestEntries,
};
