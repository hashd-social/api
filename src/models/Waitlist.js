/**
 * Waitlist Model
 * Mongoose schema and model for waitlist entries
 */

const mongoose = require('mongoose');

/**
 * Waitlist Entry Schema
 * Defines the structure and validation rules for waitlist entries
 */
const waitlistSchema = new mongoose.Schema(
  {
    // User Information
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
      index: true,
    },

    walletAddress: {
      type: String,
      default: null,
      sparse: true,
      validate: {
        validator: function (v) {
          // If provided, must be a valid Ethereum address
          if (!v) return true;
          return /^0x[a-fA-F0-9]{40}$/.test(v);
        },
        message: 'Invalid Ethereum wallet address format',
      },
      index: true,
    },

    // User Roles
    roles: {
      type: [String],
      required: [true, 'At least one role is required'],
      enum: {
        values: ['developer', 'community_builder', 'investor', 'content_creator', 'early_adopter', 'other'],
        message: '{VALUE} is not a valid role',
      },
      validate: {
        validator: function (v) {
          return v && v.length > 0;
        },
        message: 'At least one role must be selected',
      },
    },

    // Optional Note
    note: {
      type: String,
      default: null,
      trim: true,
      maxlength: [500, 'Note cannot exceed 500 characters'],
    },

    // X (Twitter) Handle
    xHandle: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (v) {
          // If provided, must be a valid X handle format (without @)
          if (!v) return true;
          return /^[a-zA-Z0-9_]{1,15}$/.test(v);
        },
        message: 'Invalid X handle format. Use only letters, numbers, and underscores (1-15 characters)',
      },
      index: true,
    },

    // Email Verification
    emailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },

    verificationToken: {
      type: String,
      default: null,
      sparse: true,
      index: true,
    },

    // Social Promotion
    posted: {
      type: Boolean,
      default: false,
      index: true,
    },

    postUrl: {
      type: String,
      default: null,
      validate: {
        validator: function (v) {
          // If provided, must be a valid X/Twitter URL
          if (!v) return true;
          return /^https:\/\/(twitter\.com|x\.com)\/\w+\/status\/\d+/.test(v);
        },
        message: 'Invalid X/Twitter URL format',
      },
    },

    // Status Management
    status: {
      type: String,
      enum: {
        values: ['pending', 'approved', 'rejected'],
        message: '{VALUE} is not a valid status',
      },
      default: 'pending',
      index: true,
    },

    // Metadata
    createdAt: {
      type: Date,
      default: Date.now,
      index: -1, // Descending index for recent entries first
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    // Schema Options
    timestamps: true, // Automatically manage createdAt and updatedAt
    collection: 'waitlist',
  }
);

/**
 * Indexes
 * Compound indexes for common queries
 */
waitlistSchema.index({ status: 1, createdAt: -1 });
waitlistSchema.index({ emailVerified: 1, status: 1 });

/**
 * Instance Methods
 */

/**
 * Check if email is verified
 * @returns {boolean}
 */
waitlistSchema.methods.isVerified = function () {
  return this.emailVerified === true;
};

/**
 * Check if entry is approved
 * @returns {boolean}
 */
waitlistSchema.methods.isApproved = function () {
  return this.status === 'approved';
};

/**
 * Get sanitized entry (remove sensitive fields)
 * @returns {Object}
 */
waitlistSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.verificationToken;
  return obj;
};

/**
 * Static Methods
 */

/**
 * Find entry by email
 * @param {string} email - Email address
 * @returns {Promise<Document|null>}
 */
waitlistSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

/**
 * Find entry by verification token
 * @param {string} token - Verification token
 * @returns {Promise<Document|null>}
 */
waitlistSchema.statics.findByVerificationToken = function (token) {
  return this.findOne({ verificationToken: token });
};

/**
 * Find entry by wallet address
 * @param {string} walletAddress - Wallet address
 * @returns {Promise<Document|null>}
 */
waitlistSchema.statics.findByWallet = function (walletAddress) {
  return this.findOne({ walletAddress });
};

/**
 * Get paginated entries with filters
 * @param {Object} options - Query options
 * @returns {Promise<Object>}
 */
waitlistSchema.statics.getPaginated = async function ({
  page = 1,
  limit = 50,
  status,
  search,
  emailVerified,
}) {
  const query = {};

  // Status filter
  if (status) {
    query.status = status;
  }

  // Email verified filter
  if (emailVerified !== undefined) {
    query.emailVerified = emailVerified;
  }

  // Search filter (name or email)
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  // Get total count
  const total = await this.countDocuments(query);

  // Get paginated results
  const entries = await this.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return {
    entries,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get statistics
 * @returns {Promise<Object>}
 */
waitlistSchema.statics.getStatistics = async function () {
  const [total, verified, pending, approved, rejected] = await Promise.all([
    this.countDocuments({}),
    this.countDocuments({ emailVerified: true }),
    this.countDocuments({ status: 'pending' }),
    this.countDocuments({ status: 'approved' }),
    this.countDocuments({ status: 'rejected' }),
  ]);

  return {
    total,
    verified,
    pending,
    approved,
    rejected,
    unverified: total - verified,
  };
};

/**
 * Pre-save Middleware
 * Update the updatedAt timestamp before saving
 */
waitlistSchema.pre('save', function () {
  this.updatedAt = new Date();
});

/**
 * Pre-update Middleware
 * Update the updatedAt timestamp before updating
 */
waitlistSchema.pre('findOneAndUpdate', function () {
  this.set({ updatedAt: new Date() });
});

/**
 * Export Model
 */
const Waitlist = mongoose.model('Waitlist', waitlistSchema);

module.exports = Waitlist;
