/**
 * Express Application Configuration
 * Main application setup and middleware configuration
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import routes
const waitlistRoutes = require('./routes/waitlist');
const adminRoutes = require('./routes/admin');

// Create Express app
const app = express();

/**
 * Trust Proxy Configuration
 * Required for Heroku and other reverse proxies to correctly identify client IPs
 */
app.set('trust proxy', 1);

/**
 * CORS Configuration
 * Supports multiple frontend domains
 */
const getAllowedOrigins = () => {
  // Check for CORS_ORIGIN first (comma-separated list)
  if (process.env.CORS_ORIGIN) {
    return process.env.CORS_ORIGIN.split(',').map(origin => origin.trim());
  }
  
  // Fallback to FRONTEND_URL for backward compatibility
  if (process.env.FRONTEND_URL) {
    return [process.env.FRONTEND_URL];
  }
  
  // Development fallback - include web (3000), relayer (3001), api (3002), and dashboard (3003)
  return ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'];
};

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = getAllowedOrigins();
    
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}. Allowed: ${allowedOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

/**
 * HTTPS Enforcement Middleware (Production Only)
 * Redirects HTTP requests to HTTPS
 */
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

/**
 * Global Middleware
 */
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

/**
 * Request Logging Middleware (Development)
 * Disabled in test mode to reduce noise
 */
if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

/**
 * Root Endpoint
 * @route GET /
 */
app.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: 'HASHdash v1.0.0',
  });
});

/**
 * Health Check Endpoint
 * @route GET /health
 */
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'HASHdash is running',
    endpoints: {
      health: '/health',
      waitlist: '/api/waitlist',
      admin: '/api/admin',
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * API Routes
 */
app.use('/api/waitlist', waitlistRoutes);
app.use('/api', waitlistRoutes); // For /api/verify-email/:token
app.use('/api/admin', adminRoutes);

/**
 * 404 Handler
 */
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Endpoint not found' 
  });
});

/**
 * Global Error Handler
 */
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  res.status(err.status || 500).json({ 
    success: false, 
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

module.exports = app;
