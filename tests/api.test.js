const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-min-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-min-32-characters-long';
process.env.STORAGE_USE_LOCAL = 'true';

jest.setTimeout(30000);

const app = require('../src/app');

describe('Health & System', () => {
  test('GET /health returns operational status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('OPERATIONAL');
    expect(res.body.data.service).toBe('fh-development-api');
  });

  test('GET /heath alias returns operational status', async () => {
    const res = await request(app).get('/heath');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('OPERATIONAL');
  });

  test('GET /api/v1/health returns operational status', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.data.service).toBe('fh-development-api');
  });

  test('GET /api/v1/system/status returns service checks', async () => {
    const res = await request(app).get('/api/v1/system/status');
    expect(res.status).toBe(200);
    expect(res.body.data.services).toBeDefined();
    expect(res.body.data.services.api).toBe('OPERATIONAL');
  });
});

describe('Authentication & User Flow', () => {
  const testEmail = `testuser_${Date.now()}@example.com`;
  let clientToken = '';
  let adminToken = '';
  let seededPlanId = '';
  let createdRequestId = '';

  test('POST /api/v1/auth/register rejects invalid email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ username: 'testuser', email: 'invalid', password: 'password123' });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('POST /api/v1/auth/register creates a new user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: `user_${Date.now()}`,
        email: testEmail,
        password: 'Password123!',
        displayName: 'Test Client User',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();

    const { query } = require('../src/config/database');
    await query("UPDATE users SET status = 'ACTIVE', email_verified = true WHERE email = $1", [testEmail]);
  });

  test('POST /api/v1/auth/login logs in created client account', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: 'Password123!',
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    clientToken = res.body.data.accessToken;
  });

  test('GET /api/v1/auth/me returns client profile with valid JWT', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testEmail);
  });

  test('POST /api/v1/auth/login logs in seeded admin account', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@fh-development.xyz',
        password: 'AdminPass123!',
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    adminToken = res.body.data.accessToken;
  });

  test('GET /api/v1/hosting/plans retrieves seeded hosting plans', async () => {
    const res = await request(app).get('/api/v1/hosting/plans');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    seededPlanId = res.body.data[0].id;
  });

  test('POST /api/v1/hosting/request submits hosting request as authenticated client', async () => {
    const res = await request(app)
      .post('/api/v1/hosting/request')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        planId: seededPlanId,
        serviceName: 'Production Discord Bot',
        softwareStack: 'Node.js 20',
        environmentVariables: { NODE_ENV: 'production' },
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('REQUESTED');
    createdRequestId = res.body.data.id;
  });

  test('GET /api/v1/admin/hosting/requests lists hosting requests for admin', async () => {
    const res = await request(app)
      .get('/api/v1/admin/hosting/requests')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    const found = res.body.data.some(r => r.id === createdRequestId);
    expect(found).toBe(true);
  });

  test('PUT /api/v1/admin/hosting/requests/:id/status updates status to UNDER_REVIEW', async () => {
    const res = await request(app)
      .put(`/api/v1/admin/hosting/requests/${createdRequestId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'UNDER_REVIEW',
        adminNotes: 'Assigned to node-uk-01 for provisioning.',
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('UNDER_REVIEW');
  });
});

describe('Public and Content Endpoints', () => {
  test('GET /api/v1/products returns paginated response', async () => {
    const res = await request(app).get('/api/v1/products');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });

  test('GET /api/v1/services returns services list', async () => {
    const res = await request(app).get('/api/v1/services');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/v1/faq returns FAQ list', async () => {
    const res = await request(app).get('/api/v1/faq');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/v1/blog returns blog posts', async () => {
    const res = await request(app).get('/api/v1/blog');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/v1/roadmap returns roadmap items', async () => {
    const res = await request(app).get('/api/v1/roadmap');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/v1/company returns company profile', async () => {
    const res = await request(app).get('/api/v1/company');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.company).toBeDefined();
  });

  test('POST /api/v1/contact accepts valid contact submission', async () => {
    const res = await request(app)
      .post('/api/v1/contact')
      .send({
        name: 'Integration Test User',
        email: 'tester@example.com',
        subject: 'Product Inquiry',
        message: 'Hello, looking forward to using FH Developments.',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

describe('Error & 404 handling', () => {
  test('Unknown route returns 404 with structured error', async () => {
    const res = await request(app).get('/api/v1/nonexistent-route');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

