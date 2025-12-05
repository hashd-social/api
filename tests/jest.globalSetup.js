/**
 * Global Setup
 * Runs once before all test suites
 */

const mongoose = require('mongoose');
require('dotenv').config();

module.exports = async () => {
  const testDbName = process.env.MONGODB_TEST_DB_NAME || 'hashd-test';
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';

  console.log('🧹 Clearing test database before test run...');

  try {
    await mongoose.connect(uri, { dbName: testDbName });
    
    // Drop the entire test database to ensure clean state
    await mongoose.connection.dropDatabase();
    
    console.log(`✅ Test database "${testDbName}" cleared`);
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Failed to clear test database:', error);
    throw error;
  }
};
