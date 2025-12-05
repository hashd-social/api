/**
 * Waitlist API Integration Tests
 * Tests for public waitlist endpoints
 */

const request = require('supertest');
const app = require('../../src/app');
const { connectTestDB, disconnectTestDB, clearDatabase } = require('../helpers/dbHelper');
const { validWaitlistEntry, validWaitlistEntry2, invalidEntries } = require('../fixtures/testData');
const Waitlist = require('../../src/models/Waitlist');

describe('Waitlist API Endpoints', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('POST /api/waitlist', () => {
    test('should create a new waitlist entry', async () => {
      const response = await request(app)
        .post('/api/waitlist')
        .send(validWaitlistEntry)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('waitlist');
      expect(response.body.id).toBeDefined();

      // Verify in database
      const entry = await Waitlist.findById(response.body.id);
      expect(entry).toBeDefined();
      expect(entry.email).toBe(validWaitlistEntry.email.toLowerCase());
    });

    test('should reject entry without name', async () => {
      const response = await request(app)
        .post('/api/waitlist')
        .send(invalidEntries.missingName)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    test('should reject entry without email', async () => {
      const response = await request(app)
        .post('/api/waitlist')
        .send(invalidEntries.missingEmail)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should reject entry with invalid email', async () => {
      const response = await request(app)
        .post('/api/waitlist')
        .send(invalidEntries.invalidEmail)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('email');
    });

    test('should reject entry without roles', async () => {
      const response = await request(app)
        .post('/api/waitlist')
        .send(invalidEntries.missingRoles)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should reject entry with invalid wallet address', async () => {
      const response = await request(app)
        .post('/api/waitlist')
        .send(invalidEntries.invalidWallet)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('wallet');
    });

    test('should reject entry with note too long', async () => {
      const response = await request(app)
        .post('/api/waitlist')
        .send(invalidEntries.longNote)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('500 characters');
    });

    test('should reject duplicate email', async () => {
      // Create first entry
      await request(app)
        .post('/api/waitlist')
        .send(validWaitlistEntry)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/waitlist')
        .send(validWaitlistEntry)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already');
    });

    test('should allow entry without wallet address', async () => {
      const response = await request(app)
        .post('/api/waitlist')
        .send(validWaitlistEntry2)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    test('should convert email to lowercase', async () => {
      const response = await request(app)
        .post('/api/waitlist')
        .send({
          ...validWaitlistEntry,
          email: 'TEST@EXAMPLE.COM',
        })
        .expect(201);

      const entry = await Waitlist.findById(response.body.id);
      expect(entry.email).toBe('test@example.com');
    });
  });

  describe('GET /api/verify-email/:token', () => {
    test('should verify email with valid token', async () => {
      // Create entry with token
      const entry = await new Waitlist({
        ...validWaitlistEntry,
        verificationToken: 'valid-token-123',
      }).save();

      const response = await request(app)
        .get('/api/verify-email/valid-token-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('verified');

      // Verify in database
      const updated = await Waitlist.findById(entry._id);
      expect(updated.emailVerified).toBe(true);
      expect(updated.status).toBe('approved');
      expect(updated.verificationToken).toBeNull();
    });

    test('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/verify-email/invalid-token')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid');
    });

    test('should handle already verified email', async () => {
      // Create verified entry
      await new Waitlist({
        ...validWaitlistEntry,
        emailVerified: true,
        verificationToken: 'already-used-token',
      }).save();

      const response = await request(app)
        .get('/api/verify-email/already-used-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.alreadyVerified).toBe(true);
    });

    test('should require token parameter', async () => {
      const response = await request(app)
        .get('/api/verify-email/')
        .expect(404);
    });
  });

  describe('Rate Limiting', () => {
    test.skip('should rate limit waitlist submissions (disabled in test mode)', async () => {
      // Note: Rate limiting is disabled in test environment to allow tests to run
      // This test would pass in production but is skipped in test mode
      // To test rate limiting, run the API in development mode and test manually
    });
  });
});
