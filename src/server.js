/**
 * Server Entry Point
 * Initializes services and starts the Express server
 */

require('dotenv').config();
const app = require('./app');
const database = require('./config/database');
const emailConfig = require('./config/email');

// Configuration
const PORT = process.env.PORT || 3002;
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Initialize all services
 */
async function initializeServices() {
  console.log('🚀 Initializing Hashd Waitlist API...');
  console.log(`📍 Environment: ${NODE_ENV}`);
  
  try {
    // Connect to database
    await database.connect();
    
    // Initialize email service
    emailConfig.initialize();
    
    console.log('✅ All services initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
    return false;
  }
}

/**
 * Start the server
 */
async function startServer() {
  // Initialize services
  const initialized = await initializeServices();
  
  if (!initialized) {
    console.error('❌ Server startup aborted due to initialization errors');
    process.exit(1);
  }

  // Start listening
  const server = app.listen(PORT, () => {
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log(`✅ Hashd Waitlist API running on port ${PORT}`);
    console.log(`📍 Environment: ${NODE_ENV}`);
    console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
    console.log(`🔐 Admin Wallet: ${process.env.ADMIN_WALLET_ADDRESS || 'Not configured'}`);
    console.log('═══════════════════════════════════════════════════');
    console.log('');
  });

  // Graceful shutdown handlers
  const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);
    
    // Stop accepting new connections
    server.close(async () => {
      console.log('✅ HTTP server closed');
      
      // Close database connection
      await database.close();
      
      console.log('✅ Graceful shutdown complete');
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error('❌ Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  // Handle shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
  });
}

// Start the server
startServer();
