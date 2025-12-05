/**
 * Waitlist Model Unit Tests
 * Tests for Mongoose model validation and methods
 */

const Waitlist = require('../../../src/models/Waitlist');
const { connectTestDB, disconnectTestDB, clearDatabase } = require('../../helpers/dbHelper');
const { validWaitlistEntry, invalidEntries } = require('../../fixtures/testData');

describe('Waitlist Model', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('Schema Validation', () => {
    test('should create a valid waitlist entry', async () => {
      const entry = new Waitlist(validWaitlistEntry);
      const savedEntry = await entry.save();

      expect(savedEntry._id).toBeDefined();
      expect(savedEntry.name).toBe(validWaitlistEntry.name);
      expect(savedEntry.email).toBe(validWaitlistEntry.email.toLowerCase());
      expect(savedEntry.walletAddress).toBe(validWaitlistEntry.walletAddress);
      expect(savedEntry.roles).toEqual(validWaitlistEntry.roles);
      expect(savedEntry.note).toBe(validWaitlistEntry.note);
      expect(savedEntry.emailVerified).toBe(false);
      expect(savedEntry.status).toBe('pending');
      expect(savedEntry.createdAt).toBeDefined();
      expect(savedEntry.updatedAt).toBeDefined();
    });

    test('should fail without name', async () => {
      const entry = new Waitlist(invalidEntries.missingName);
      
      await expect(entry.save()).rejects.toThrow();
    });

    test('should fail without email', async () => {
      const entry = new Waitlist(invalidEntries.missingEmail);
      
      await expect(entry.save()).rejects.toThrow();
    });

    test('should fail with invalid email format', async () => {
      const entry = new Waitlist(invalidEntries.invalidEmail);
      
      await expect(entry.save()).rejects.toThrow();
    });

    test('should fail without roles', async () => {
      const entry = new Waitlist(invalidEntries.missingRoles);
      
      await expect(entry.save()).rejects.toThrow();
    });

    test('should fail with empty roles array', async () => {
      const entry = new Waitlist(invalidEntries.emptyRoles);
      
      await expect(entry.save()).rejects.toThrow();
    });

    test('should fail with invalid role', async () => {
      const entry = new Waitlist(invalidEntries.invalidRole);
      
      await expect(entry.save()).rejects.toThrow();
    });

    test('should fail with invalid wallet address', async () => {
      const entry = new Waitlist(invalidEntries.invalidWallet);
      
      await expect(entry.save()).rejects.toThrow();
    });

    test('should fail with note too long', async () => {
      const entry = new Waitlist(invalidEntries.longNote);
      
      await expect(entry.save()).rejects.toThrow();
    });

    test('should enforce unique email', async () => {
      await new Waitlist(validWaitlistEntry).save();
      
      const duplicate = new Waitlist(validWaitlistEntry);
      
      await expect(duplicate.save()).rejects.toThrow();
    });

    test('should convert email to lowercase', async () => {
      const entry = new Waitlist({
        ...validWaitlistEntry,
        email: 'TEST@EXAMPLE.COM',
      });
      
      const saved = await entry.save();
      expect(saved.email).toBe('test@example.com');
    });

    test('should allow null wallet address', async () => {
      const entry = new Waitlist({
        ...validWaitlistEntry,
        walletAddress: null,
      });
      
      const saved = await entry.save();
      expect(saved.walletAddress).toBeNull();
    });
  });

  describe('Instance Methods', () => {
    test('isVerified() should return false for unverified entry', async () => {
      const entry = await new Waitlist(validWaitlistEntry).save();
      
      expect(entry.isVerified()).toBe(false);
    });

    test('isVerified() should return true for verified entry', async () => {
      const entry = await new Waitlist({
        ...validWaitlistEntry,
        emailVerified: true,
      }).save();
      
      expect(entry.isVerified()).toBe(true);
    });

    test('isApproved() should return false for pending entry', async () => {
      const entry = await new Waitlist(validWaitlistEntry).save();
      
      expect(entry.isApproved()).toBe(false);
    });

    test('isApproved() should return true for approved entry', async () => {
      const entry = await new Waitlist({
        ...validWaitlistEntry,
        status: 'approved',
      }).save();
      
      expect(entry.isApproved()).toBe(true);
    });

    test('toSafeObject() should remove verification token', async () => {
      const entry = await new Waitlist({
        ...validWaitlistEntry,
        verificationToken: 'secret-token',
      }).save();
      
      const safeObj = entry.toSafeObject();
      
      expect(safeObj.verificationToken).toBeUndefined();
      expect(safeObj.email).toBeDefined();
      expect(safeObj.name).toBeDefined();
    });
  });

  describe('Static Methods', () => {
    test('findByEmail() should find entry by email', async () => {
      await new Waitlist(validWaitlistEntry).save();
      
      const found = await Waitlist.findByEmail(validWaitlistEntry.email);
      
      expect(found).toBeDefined();
      expect(found.email).toBe(validWaitlistEntry.email.toLowerCase());
    });

    test('findByEmail() should be case-insensitive', async () => {
      await new Waitlist(validWaitlistEntry).save();
      
      const found = await Waitlist.findByEmail(validWaitlistEntry.email.toUpperCase());
      
      expect(found).toBeDefined();
    });

    test('findByVerificationToken() should find entry by token', async () => {
      const token = 'test-token-123';
      await new Waitlist({
        ...validWaitlistEntry,
        verificationToken: token,
      }).save();
      
      const found = await Waitlist.findByVerificationToken(token);
      
      expect(found).toBeDefined();
      expect(found.verificationToken).toBe(token);
    });

    test('findByWallet() should find entry by wallet address', async () => {
      await new Waitlist(validWaitlistEntry).save();
      
      const found = await Waitlist.findByWallet(validWaitlistEntry.walletAddress);
      
      expect(found).toBeDefined();
      expect(found.walletAddress).toBe(validWaitlistEntry.walletAddress);
    });

    test('getStatistics() should return correct stats', async () => {
      // Create test entries
      await new Waitlist(validWaitlistEntry).save();
      await new Waitlist({
        ...validWaitlistEntry,
        email: 'verified@example.com',
        emailVerified: true,
        status: 'approved',
      }).save();
      await new Waitlist({
        ...validWaitlistEntry,
        email: 'rejected@example.com',
        status: 'rejected',
      }).save();
      
      const stats = await Waitlist.getStatistics();
      
      expect(stats.total).toBe(3);
      expect(stats.verified).toBe(1);
      expect(stats.unverified).toBe(2);
      expect(stats.pending).toBe(1);
      expect(stats.approved).toBe(1);
      expect(stats.rejected).toBe(1);
    });
  });

  describe('Timestamps', () => {
    test('should auto-generate createdAt and updatedAt', async () => {
      const entry = await new Waitlist(validWaitlistEntry).save();
      
      expect(entry.createdAt).toBeInstanceOf(Date);
      expect(entry.updatedAt).toBeInstanceOf(Date);
    });

    test('should update updatedAt on save', async () => {
      const entry = await new Waitlist(validWaitlistEntry).save();
      const originalUpdatedAt = entry.updatedAt;
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));
      
      entry.status = 'approved';
      await entry.save();
      
      expect(entry.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });
});
