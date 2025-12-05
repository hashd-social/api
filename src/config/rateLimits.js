/**
 * Rate Limiting Configuration
 * Defines rate limits for different API endpoints
 */

const rateLimit = require('express-rate-limit');

// Disable rate limiting in test environment and development
const isTest = process.env.NODE_ENV === 'test';
const isDev = process.env.NODE_ENV === 'development';

/**
 * Rate limiter for waitlist submissions
 * Prevents spam and abuse
 */
const waitlistLimiter = (isTest || isDev) ? (req, res, next) => next() : rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes in prod
  max: 5, // 5 per 15 minutes in prod
  message: { 
    success: false, 
    message: 'Too many requests, please try again later.' 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for email verification attempts
 * Prevents brute force attacks on verification tokens
 */
const verifyEmailLimiter = (isTest || isDev) ? (req, res, next) => next() : rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 verification attempts per hour per IP
  message: { 
    success: false, 
    message: 'Too many verification attempts, please try again later.' 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for admin endpoints
 * Higher limit for authenticated admin operations
 */
const adminLimiter = (isTest || isDev) ? (req, res, next) => next() : rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { 
    success: false, 
    message: 'Too many requests, please slow down.' 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  waitlistLimiter,
  verifyEmailLimiter,
  adminLimiter,
};
