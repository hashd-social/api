/**
 * End-to-End Flow Tests
 * Tests complete user journeys through the API
 */

const request = require('supertest');
const app = require('../../src/app');
const { connectTestDB, disconnectTestDB, clearDatabase } = require('../helpers/dbHelper');
const { validWaitlistEntry, generateAdminSignature } = require('../fixtures/testData');
const Waitlist = require('../../src/models/Waitlist');

describe('E2E: Complete Waitlist Flow', () => {
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

  test('Complete user journey: Submit -> Verify -> Admin Review', async () => {
    // Step 1: User submits waitlist entry
    const submitResponse = await request(app)
      .post('/api/waitlist')
      .send(validWaitlistEntry)
      .expect(201);

    expect(submitResponse.body.success).toBe(true);
    const entryId = submitResponse.body.id;

    // Step 2: Get verification token from database (simulating email)
    let entry = await Waitlist.findById(entryId);
    expect(entry.emailVerified).toBe(false);
    expect(entry.status).toBe('pending');
    const verificationToken = entry.verificationToken;

    // Step 3: User verifies email
    const verifyResponse = await request(app)
      .get(`/api/verify-email/${verificationToken}`)
      .expect(200);

    expect(verifyResponse.body.success).toBe(true);

    // Step 4: Verify email is marked as verified
    entry = await Waitlist.findById(entryId);
    expect(entry.emailVerified).toBe(true);
    expect(entry.status).toBe('approved');
    expect(entry.verificationToken).toBeNull();

    // Step 5: Admin views waitlist
    const listResponse = await request(app)
      .post('/api/admin/waitlist')
      .send({
        ...adminAuth,
        page: 1,
        limit: 10,
      })
      .expect(200);

    expect(listResponse.body.entries).toHaveLength(1);
    expect(listResponse.body.entries[0]._id).toBe(entryId.toString());

    // Step 6: Admin gets statistics
    const statsResponse = await request(app)
      .get('/api/admin/stats')
      .send(adminAuth)
      .expect(200);

    expect(statsResponse.body.stats.total).toBe(1);
    expect(statsResponse.body.stats.verified).toBe(1);
    expect(statsResponse.body.stats.approved).toBe(1);
  });

  test('Admin workflow: Review -> Update Status -> Export', async () => {
    // Create multiple entries
    await request(app).post('/api/waitlist').send(validWaitlistEntry);
    await request(app).post('/api/waitlist').send({
      ...validWaitlistEntry,
      email: 'user2@example.com',
    });
    await request(app).post('/api/waitlist').send({
      ...validWaitlistEntry,
      email: 'user3@example.com',
    });

    // Admin gets list
    const listResponse = await request(app)
      .post('/api/admin/waitlist')
      .send({
        ...adminAuth,
        page: 1,
        limit: 10,
      })
      .expect(200);

    expect(listResponse.body.entries).toHaveLength(3);

    // Admin updates status of first entry
    const firstEntryId = listResponse.body.entries[0]._id;
    await request(app)
      .post(`/api/admin/waitlist/${firstEntryId}/status`)
      .send({
        ...adminAuth,
        status: 'approved',
      })
      .expect(200);

    // Admin rejects second entry
    const secondEntryId = listResponse.body.entries[1]._id;
    await request(app)
      .post(`/api/admin/waitlist/${secondEntryId}/status`)
      .send({
        ...adminAuth,
        status: 'rejected',
      })
      .expect(200);

    // Admin exports waitlist
    const exportResponse = await request(app)
      .post('/api/admin/waitlist/export')
      .send(adminAuth)
      .expect(200);

    expect(exportResponse.text).toContain('approved');
    expect(exportResponse.text).toContain('rejected');
    expect(exportResponse.text).toContain('pending');

    // Verify statistics
    const statsResponse = await request(app)
      .get('/api/admin/stats')
      .send(adminAuth)
      .expect(200);

    expect(statsResponse.body.stats.total).toBe(3);
    expect(statsResponse.body.stats.approved).toBe(1);
    expect(statsResponse.body.stats.rejected).toBe(1);
    expect(statsResponse.body.stats.pending).toBe(1);
  });

  test('Error handling: Duplicate submission and recovery', async () => {
    const uniqueEntry = {
      ...validWaitlistEntry,
      email: 'duplicate-test@example.com',
    };

    // First submission succeeds
    await request(app)
      .post('/api/waitlist')
      .send(uniqueEntry)
      .expect(201);

    // Duplicate submission fails
    const duplicateResponse = await request(app)
      .post('/api/waitlist')
      .send(uniqueEntry)
      .expect(409);

    expect(duplicateResponse.body.success).toBe(false);
    expect(duplicateResponse.body.message).toContain('already');

    // Admin can still see the original entry
    const listResponse = await request(app)
      .post('/api/admin/waitlist')
      .send({
        ...adminAuth,
        search: uniqueEntry.email,
      })
      .expect(200);

    expect(listResponse.body.entries).toHaveLength(1);
  });

  test('Verification flow: Lost token and resend', async () => {
    const uniqueEntry = {
      ...validWaitlistEntry,
      email: 'resend-test@example.com',
    };

    // User submits
    const submitResponse = await request(app)
      .post('/api/waitlist')
      .send(uniqueEntry)
      .expect(201);

    const entryId = submitResponse.body.id;

    // Simulate lost verification email - admin resends
    const resendResponse = await request(app)
      .post(`/api/admin/waitlist/${entryId}/resend-verification`)
      .send(adminAuth);

    // Get new token
    const entry = await Waitlist.findById(entryId);
    const newToken = entry.verificationToken;
    expect(newToken).toBeDefined();

    // User verifies with new token
    await request(app)
      .get(`/api/verify-email/${newToken}`)
      .expect(200);

    // Verify email is now verified
    const verified = await Waitlist.findById(entryId);
    expect(verified.emailVerified).toBe(true);
  });

  test('Admin workflow: Search and filter', async () => {
    // Create diverse entries with unique emails
    await request(app).post('/api/waitlist').send({
      ...validWaitlistEntry,
      name: 'Alice Developer',
      email: 'alice-search@example.com',
      roles: ['developer'],
    });

    await request(app).post('/api/waitlist').send({
      ...validWaitlistEntry,
      name: 'Bob Investor',
      email: 'bob-search@example.com',
      roles: ['investor'],
    });

    await request(app).post('/api/waitlist').send({
      ...validWaitlistEntry,
      name: 'Charlie User',
      email: 'charlie-search@example.com',
      roles: ['user'],
    });

    // Wait a bit for database to sync
    await new Promise(resolve => setTimeout(resolve, 100));

    // Search by name
    const searchResponse = await request(app)
      .post('/api/admin/waitlist')
      .send({
        ...adminAuth,
        search: 'Alice',
      })
      .expect(200);

    expect(searchResponse.body.entries.length).toBeGreaterThanOrEqual(1);
    const aliceEntry = searchResponse.body.entries.find(e => e.name.includes('Alice'));
    expect(aliceEntry).toBeDefined();

    // Filter by status
    const entry = await Waitlist.findOne({ email: 'bob-search@example.com' });
    await Waitlist.findByIdAndUpdate(entry._id, { status: 'approved' });

    // Wait for update
    await new Promise(resolve => setTimeout(resolve, 100));

    const filterResponse = await request(app)
      .post('/api/admin/waitlist')
      .send({
        ...adminAuth,
        status: 'approved',
      })
      .expect(200);

    expect(filterResponse.body.entries.length).toBeGreaterThanOrEqual(1);
    const bobEntry = filterResponse.body.entries.find(e => e.email === 'bob-search@example.com');
    expect(bobEntry).toBeDefined();
  });
});
