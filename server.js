const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { MongoClient, ObjectId } = require('mongodb');
const { ethers } = require('ethers');
const crypto = require('crypto');
const { Resend } = require('resend');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || 'hashd_waitlist';
const ADMIN_WALLET = process.env.ADMIN_WALLET_ADDRESS?.toLowerCase();

// Resend email configuration
let resend;

function setupResend() {
  if (process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
    console.log('✅ Resend email service configured');
  } else {
    console.warn('⚠️  RESEND_API_KEY not set. Email sending will be disabled.');
  }
}

// Rate limiting
const isDev = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';
const waitlistLimiter = (isDev || isTest) ? (req, res, next) => next() : rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes in prod
  max: 5, // 5 per 15 minutes in prod
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const verifyEmailLimiter = (isDev || isTest) ? (req, res, next) => next() : rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 verification attempts per hour
  message: { success: false, message: 'Too many verification attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const adminLimiter = (isDev || isTest) ? (req, res, next) => next() : rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute for admin
  message: { success: false, message: 'Too many requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
const corsOptions = {
  origin: process.env.FRONTEND_URL,
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// MongoDB connection
let db;
let waitlistCollection;

async function connectDB() {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    db = client.db(DB_NAME);
    waitlistCollection = db.collection('waitlist');
    
    // Create indexes
    await waitlistCollection.createIndex({ email: 1 }, { unique: true });
    await waitlistCollection.createIndex({ walletAddress: 1 }, { sparse: true });
    await waitlistCollection.createIndex({ createdAt: -1 });
    await waitlistCollection.createIndex({ verificationToken: 1 }, { sparse: true });
    
    console.log('✅ Database indexes created');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Middleware to verify wallet signature
async function verifyWalletSignature(req, res, next) {
  try {
    const { walletAddress, signature, message } = req.body;
    
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

    // Check if it's the admin wallet
    if (recoveredAddress.toLowerCase() !== ADMIN_WALLET) {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized: Admin access only' 
      });
    }

    req.authenticatedWallet = recoveredAddress.toLowerCase();
    next();
  } catch (error) {
    console.error('Signature verification error:', error);
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication failed' 
    });
  }
}

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Hashd Waitlist API is running',
    timestamp: new Date().toISOString()
  });
});

// Submit waitlist entry
app.post('/api/waitlist', waitlistLimiter, async (req, res) => {
  try {
    const { name, email, walletAddress, roles, note, xHandle } = req.body;

    // Validation
    if (!name || !email || !roles || roles.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    // Note is optional, no validation needed for it

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email address' 
      });
    }

    // Wallet address validation (if provided)
    if (walletAddress && !ethers.isAddress(walletAddress)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid wallet address' 
      });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Create waitlist entry
    const entry = {
      name,
      email: email.toLowerCase(),
      walletAddress: walletAddress || null,
      roles,
      note: note && note.trim() ? note.trim() : null,
      xHandle: xHandle && xHandle.trim() ? xHandle.trim().toLowerCase() : null,
      emailVerified: false,
      verificationToken,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'pending' // pending, approved, rejected
    };

    const result = await waitlistCollection.insertOne(entry);

    // Send verification email using the email service
    try {
      const emailService = require('./src/services/emailService');
      await emailService.sendVerificationEmail(email, verificationToken, name);
      console.log(`✅ New waitlist entry: ${email} (verification email sent)`);
    } catch (emailError) {
      console.error('❌ Failed to send verification email:', emailError);
      // Don't fail the registration if email fails
    }

    res.status(201).json({ 
      success: true, 
      message: 'Successfully joined the waitlist. Please check your email to verify your address.',
      id: result.insertedId
    });

  } catch (error) {
    console.error('Waitlist submission error:', error);
    
    // Handle duplicate email
    if (error.code === 11000) {
      return res.status(409).json({ 
        success: false, 
        message: 'This email is already on the waitlist' 
      });
    }

    res.status(500).json({ 
      success: false, 
      message: 'Failed to join waitlist. Please try again.' 
    });
  }
});

// Resend verification email (protected)
app.post('/api/admin/waitlist/:id/resend-verification', adminLimiter, verifyWalletSignature, async (req, res) => {
  try {
    const { id } = req.params;

    const entry = await waitlistCollection.findOne({ _id: new ObjectId(id) });

    if (!entry) {
      return res.status(404).json({ 
        success: false, 
        message: 'Entry not found' 
      });
    }

    if (entry.emailVerified) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already verified' 
      });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Update entry with new token
    await waitlistCollection.updateOne(
      { _id: entry._id },
      { 
        $set: { 
          verificationToken,
          updatedAt: new Date()
        }
      }
    );

    // Send verification email using the email service
    try {
      const emailService = require('./src/services/emailService');
      await emailService.resendVerificationEmail(entry.email, verificationToken, entry.name);
      console.log(`✅ Verification email resent: ${entry.email}`);
    } catch (emailError) {
      console.error('❌ Failed to resend verification email:', emailError);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to send verification email' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Verification email resent successfully' 
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to resend verification email' 
    });
  }
});

// Verify email endpoint
app.get('/api/verify-email/:token', verifyEmailLimiter, async (req, res) => {
  try {
    const { token } = req.params;

    const entry = await waitlistCollection.findOne({ verificationToken: token });

    if (!entry) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invalid or expired verification token' 
      });
    }

    if (entry.emailVerified) {
      return res.json({ 
        success: true, 
        message: 'Email already verified',
        alreadyVerified: true
      });
    }

    // Update entry to mark email as verified and approve
    await waitlistCollection.updateOne(
      { _id: entry._id },
      { 
        $set: { 
          emailVerified: true,
          status: 'approved',
          updatedAt: new Date()
        },
        $unset: { verificationToken: '' }
      }
    );

    console.log(`✅ Email verified: ${entry.email}`);

    res.json({ 
      success: true, 
      message: 'Email verified successfully!'
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to verify email' 
    });
  }
});

// Get all waitlist entries (protected)
app.post('/api/admin/waitlist', adminLimiter, verifyWalletSignature, async (req, res) => {
  try {
    const { page = 1, limit = 50, status, search } = req.body;

    // Build query
    const query = {};
    if (status) {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { walletAddress: { $regex: search, $options: 'i' } }
      ];
    }

    // Get total count
    const total = await waitlistCollection.countDocuments(query);

    // Get paginated results
    const entries = await waitlistCollection
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    // Get statistics
    const stats = await waitlistCollection.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    const roleStats = await waitlistCollection.aggregate([
      { $unwind: '$roles' },
      {
        $group: {
          _id: '$roles',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();

    res.json({ 
      success: true,
      data: {
        entries,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        stats: {
          byStatus: stats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
          byRole: roleStats.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {}),
          total
        }
      }
    });

  } catch (error) {
    console.error('Admin fetch error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch waitlist entries' 
    });
  }
});

// Update waitlist entry status (protected)
app.post('/api/admin/waitlist/:id/status', adminLimiter, verifyWalletSignature, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status' 
      });
    }

    const result = await waitlistCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          status,
          updatedAt: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Entry not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Status updated successfully' 
    });

  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update status' 
    });
  }
});

// Delete waitlist entry (protected)
app.post('/api/admin/waitlist/:id/delete', adminLimiter, verifyWalletSignature, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await waitlistCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Entry not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Entry deleted successfully' 
    });

  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete entry' 
    });
  }
});

// Export waitlist to CSV (protected)
app.post('/api/admin/waitlist/export', adminLimiter, verifyWalletSignature, async (req, res) => {
  try {
    const entries = await waitlistCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    // Convert to CSV
    const headers = ['Name', 'Email', 'Wallet Address', 'Roles', 'Status', 'Created At'];
    const rows = entries.map(e => [
      e.name,
      e.email,
      e.walletAddress || 'N/A',
      e.roles.join(', '),
      e.status,
      e.createdAt.toISOString()
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=hashd-waitlist.csv');
    res.send(csv);

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to export waitlist' 
    });
  }
});

// Start server
connectDB().then(() => {
  setupResend();
  app.listen(PORT, () => {
    console.log(`🚀 Hashd Waitlist API running on port ${PORT}`);
    console.log(`👤 Admin wallet: ${ADMIN_WALLET}`);
  });
});
