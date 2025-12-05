/**
 * Database Configuration
 * Handles MongoDB connection using Mongoose
 */

const mongoose = require('mongoose');

class Database {
  constructor() {
    this.isConnected = false;
  }

  /**
   * Sanitize MongoDB URI for logging (remove credentials)
   * @private
   */
  sanitizeUri(uri) {
    try {
      const url = new URL(uri);
      if (url.username || url.password) {
        url.username = '***';
        url.password = '***';
      }
      return url.toString();
    } catch {
      return '[invalid-uri]';
    }
  }

  /**
   * Connect to MongoDB using Mongoose
   * @returns {Promise<void>}
   */
  async connect() {
    try {
      const uri = process.env.MONGODB_URI;
      const dbName = process.env.MONGODB_DB_NAME || 'hashd_waitlist';

      if (!uri) {
        throw new Error('MONGODB_URI environment variable is not set');
      }

      // Mongoose connection options
      const options = {
        dbName,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      };

      // Connect to MongoDB
      await mongoose.connect(uri, options);
      
      this.isConnected = true;
      
      console.log('✅ Connected to MongoDB via Mongoose');
      console.log(`✅ Database: ${dbName}`);
      console.log(`✅ MongoDB URI: ${this.sanitizeUri(uri)}`);
      
      // Handle connection events
      this.setupEventHandlers();
      
    } catch (error) {
      console.error('❌ MongoDB connection error:', error.message);
      // Don't log full error object which might contain connection string
      throw error;
    }
  }

  /**
   * Setup Mongoose connection event handlers
   * @private
   */
  setupEventHandlers() {
    mongoose.connection.on('connected', () => {
      console.log('✅ Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  Mongoose disconnected from MongoDB');
      this.isConnected = false;
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await this.close();
      process.exit(0);
    });
  }

  /**
   * Check if database is connected
   * @returns {boolean}
   */
  isReady() {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  /**
   * Get Mongoose connection
   * @returns {Connection}
   */
  getConnection() {
    return mongoose.connection;
  }

  /**
   * Close database connection
   * @returns {Promise<void>}
   */
  async close() {
    if (this.isConnected) {
      await mongoose.connection.close();
      this.isConnected = false;
      console.log('✅ Database connection closed');
    }
  }
}

// Export singleton instance
module.exports = new Database();
