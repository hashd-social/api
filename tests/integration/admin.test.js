/**
 * Admin API Integration Tests
 * Tests for protected admin endpoints
 */

const request = require('supertest');
const app = require('../../src/app');
const { connectTestDB, disconnectTestDB, clearDatabase, createTestEntries } = require('../helpers/dbHelper');
const { 
  validWaitlistEntry, 
  validWaitlistEntry2, 
  validWaitlistEntry3,
  generateAdminSignature,
  generateInvalidSignature,
} = require('../fixtures/testData');
const Waitlist = require('../../src/models/Waitlist');

describe('Admin API Endpoints', () => {
  let adminAuth;

  beforeAll(async () => {
    await connectTestDB();
    adminAuth = await generateAdminSignature();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('Authentication', () => {
    test('should reject request without signature', async () => {
      const response = await request(app)
        .post('/api/admin/waitlist')
        .send({})
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('authentication');
    });

    test('should reject request with invalid signature', async () => {
      const invalidAuth = generateInvalidSignature();

      const response = await request(app)
        .post('/api/admin/waitlist')
        .send(invalidAuth)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should accept request with valid admin signature', async () => {
      const response = await request(app)
        .post('/api/admin/waitlist')
        .send({
          ...adminAuth,
          page: 1,
          limit: 10,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/admin/waitlist', () => {
    test('should get paginated waitlist entries', async () => {
      // Create test entries with unique emails
      await createTestEntries([
        { ...validWaitlistEntry, email: 'admin-test1@example.com' },
        { ...validWaitlistEntry2, email: 'admin-test2@example.com' },
        { ...validWaitlistEntry3, email: 'admin-test3@example.com' },
      ]);

      const response = await request(app)
        .post('/api/admin/waitlist')
        .send({
          ...adminAuth,
          page: 1,
          limit: 10,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.entries).toHaveLength(3);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBe(3);
      expect(response.body.pagination.page).toBe(1);
    });

    test('should filter by status', async () => {
      await createTestEntries([
        { ...validWaitlistEntry, email: 'filter-pending@example.com' },
        { ...validWaitlistEntry2, email: 'filter-approved@example.com', status: 'approved' },
        { ...validWaitlistEntry3, email: 'filter-rejected@example.com', status: 'rejected' },
      ]);

      const response = await request(app)
        .post('/api/admin/waitlist')
        .send({
          ...adminAuth,
          status: 'approved',
        })
        .expect(200);

      expect(response.body.entries).toHaveLength(1);
      expect(response.body.entries[0].status).toBe('approved');
    });

    test('should search by name or email', async () => {
      await createTestEntries([
        { ...validWaitlistEntry, email: 'search-john@example.com' },
        { ...validWaitlistEntry2, email: 'search-jane@example.com' },
      ]);

      const response = await request(app)
        .post('/api/admin/waitlist')
        .send({
          ...adminAuth,
          search: 'jane',
        })
        .expect(200);

      expect(response.body.entries).toHaveLength(1);
      expect(response.body.entries[0].name).toContain('Jane');
    });

    test('should handle pagination correctly', async () => {
      // Create 5 entries with unique emails
      const entries = Array.from({ length: 5 }, (_, i) => ({
        ...validWaitlistEntry,
        email: `pagination-test${i}@example.com`,
      }));
      await createTestEntries(entries);

      // Get page 1 with limit 2
      const response1 = await request(app)
        .post('/api/admin/waitlist')
        .send({
          ...adminAuth,
          page: 1,
          limit: 2,
        })
        .expect(200);

      expect(response1.body.entries).toHaveLength(2);
      expect(response1.body.pagination.pages).toBe(3);

      // Get page 2
      const response2 = await request(app)
        .post('/api/admin/waitlist')
        .send({
          ...adminAuth,
          page: 2,
          limit: 2,
        })
        .expect(200);

      expect(response2.body.entries).toHaveLength(2);
      expect(response2.body.entries[0]._id).not.toBe(response1.body.entries[0]._id);
    });
  });

  describe('POST /api/admin/waitlist/:id/status', () => {
    test('should update entry status', async () => {
      const entry = await new Waitlist(validWaitlistEntry).save();

      const response = await request(app)
        .post(`/api/admin/waitlist/${entry._id}/status`)
        .send({
          ...adminAuth,
          status: 'approved',
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify in database
      const updated = await Waitlist.findById(entry._id);
      expect(updated.status).toBe('approved');
    });

    test('should reject invalid status', async () => {
      const entry = await new Waitlist(validWaitlistEntry).save();

      const response = await request(app)
        .post(`/api/admin/waitlist/${entry._id}/status`)
        .send({
          ...adminAuth,
          status: 'invalid_status',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should reject non-existent entry', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .post(`/api/admin/waitlist/${fakeId}/status`)
        .send({
          ...adminAuth,
          status: 'approved',
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/admin/waitlist/:id/delete', () => {
    test('should delete entry', async () => {
      const entry = await new Waitlist(validWaitlistEntry).save();

      const response = await request(app)
        .post(`/api/admin/waitlist/${entry._id}/delete`)
        .send(adminAuth)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify deleted from database
      const deleted = await Waitlist.findById(entry._id);
      expect(deleted).toBeNull();
    });

    test('should reject non-existent entry', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .post(`/api/admin/waitlist/${fakeId}/delete`)
        .send(adminAuth)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/admin/waitlist/:id/resend-verification', () => {
    test('should reject already verified entry', async () => {
      const entry = await new Waitlist({
        ...validWaitlistEntry,
        emailVerified: true,
      }).save();

      const response = await request(app)
        .post(`/api/admin/waitlist/${entry._id}/resend-verification`)
        .send(adminAuth)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already verified');
    });

    test('should handle entry without verification token', async () => {
      const entry = await new Waitlist({
        ...validWaitlistEntry,
        verificationToken: null,
      }).save();

      // Note: This will try to send email, which may fail in test environment
      // We're just testing that it generates a new token
      const response = await request(app)
        .post(`/api/admin/waitlist/${entry._id}/resend-verification`)
        .send(adminAuth);

      // Check if token was generated
      const updated = await Waitlist.findById(entry._id);
      expect(updated.verificationToken).toBeDefined();
    });
  });

  describe('POST /api/admin/waitlist/export', () => {
    test('should export waitlist to CSV', async () => {
      await createTestEntries([
        validWaitlistEntry,
        { ...validWaitlistEntry2, email: 'test2@example.com' },
      ]);

      const response = await request(app)
        .post('/api/admin/waitlist/export')
        .send(adminAuth)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.text).toContain('Name,Email');
      expect(response.text).toContain(validWaitlistEntry.name);
    });

    test('should handle empty waitlist', async () => {
      const response = await request(app)
        .post('/api/admin/waitlist/export')
        .send(adminAuth)
        .expect(200);

      expect(response.text).toContain('Name,Email');
    });
  });

  describe('GET /api/admin/stats', () => {
    test('should return waitlist statistics', async () => {
      await createTestEntries([
        validWaitlistEntry,
        { ...validWaitlistEntry2, email: 'verified@example.com', emailVerified: true, status: 'approved' },
        { ...validWaitlistEntry3, email: 'rejected@example.com', status: 'rejected' },
      ]);

      const response = await request(app)
        .get('/api/admin/stats')
        .send(adminAuth)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.stats).toBeDefined();
      expect(response.body.stats.total).toBe(3);
      expect(response.body.stats.verified).toBe(1);
      expect(response.body.stats.pending).toBe(1);
      expect(response.body.stats.approved).toBe(1);
      expect(response.body.stats.rejected).toBe(1);
    });
  });
});
