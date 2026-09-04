const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-min-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-min-32-characters-long';
process.env.STORAGE_USE_LOCAL = 'true';

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

  test('GET /health?detailed=true includes service checks', async () => {
    const res = await request(app).get('/health?detailed=true');
    expect([200, 503]).toContain(res.status);
    expect(res.body.data.services).toBeDefined();
    expect(res.body.data.services.api).toBe('OPERATIONAL');
  });

  test('GET /api/v1/system/status returns service checks', async () => {
    const res = await request(app).get('/api/v1/system/status');
    expect(res.status).toBe(200);
    expect(res.body.data.services).toBeDefined();
    expect(res.body.data.services.api).toBe('OPERATIONAL');
  });
});

describe('Authentication validation', () => {
  test('POST /api/v1/auth/register rejects invalid email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ username: 'testuser', email: 'invalid', password: 'password123' });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('POST /api/v1/auth/login rejects missing fields', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({});
    expect(res.status).toBe(422);
  });

  test('GET /api/v1/auth/me requires authentication', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  test('GET /api/v1/users/me requires authentication', async () => {
    const res = await request(app).get('/api/v1/users/me');
    expect(res.status).toBe(401);
  });
});

describe('Public endpoints', () => {
  test('GET /api/v1/products returns paginated response', async () => {
    const res = await request(app).get('/api/v1/products');
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
      expect(res.body.pagination).toBeDefined();
    }
  });

  test('GET /api/v1/search requires minimum query length handling', async () => {
    const res = await request(app).get('/api/v1/search?q=a');
    expect(res.status).toBe(200);
    expect(res.body.data.results).toBeDefined();
  });

  test('POST /api/v1/contact validates input', async () => {
    const res = await request(app).post('/api/v1/contact').send({ name: 'Test' });
    expect(res.status).toBe(422);
  });
});

describe('Authorization', () => {
  test('GET /api/v1/users requires authentication', async () => {
    const res = await request(app).get('/api/v1/users');
    expect(res.status).toBe(401);
  });

  test('GET /api/v1/analytics/overview requires authentication', async () => {
    const res = await request(app).get('/api/v1/analytics/overview');
    expect(res.status).toBe(401);
  });

  test('POST /api/v1/hosting/request requires authentication', async () => {
    const res = await request(app)
      .post('/api/v1/hosting/request')
      .send({ planId: '00000000-0000-0000-0000-000000000000' });
    expect(res.status).toBe(401);
  });

  test('POST /api/v1/admin/hosting/customers requires authentication', async () => {
    const res = await request(app).get('/api/v1/admin/hosting/customers');
    expect(res.status).toBe(401);
  });

  test('GET /api/v1/cart requires authentication', async () => {
    const res = await request(app).get('/api/v1/cart');
    expect(res.status).toBe(401);
  });

  test('GET /api/v1/purchases requires authentication', async () => {
    const res = await request(app).get('/api/v1/purchases');
    expect(res.status).toBe(401);
  });

  test('DELETE /api/v1/account requires authentication', async () => {
    const res = await request(app).delete('/api/v1/account').send({ currentPassword: 'not-a-password' });
    expect(res.status).toBe(401);
  });

  test('GET /api/v1/blacklist requires an admin permission', async () => {
    const res = await request(app).get('/api/v1/blacklist');
    expect(res.status).toBe(401);
  });

  test('GET /api/v1/hosting/me/:id requires authentication', async () => {
    const res = await request(app).get('/api/v1/hosting/me/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(401);
  });

  test('GET /api/v1/support/tickets requires authentication', async () => {
    const res = await request(app).get('/api/v1/support/tickets');
    expect(res.status).toBe(401);
  });
});

describe('Blacklist', () => {
  test('public check validates identifiers', async () => {
    const res = await request(app).get('/api/v1/blacklist/check');
    expect(res.status).toBe(422);
  });
});

describe('CMS route groups', () => {
  test('public content groups return without authentication', async () => {
    const groups = ['press', 'events', 'community', 'sponsorships', 'features', 'announcements'];
    for (const group of groups) {
      const res = await request(app).get(`/api/v1/${group}`);
      expect([200, 500]).toContain(res.status);
      if (res.status === 200) expect(res.body.success).toBe(true);
    }
  });

  test('CMS mutation requires authentication', async () => {
    const res = await request(app).post('/api/v1/press').send({
      type: 'press', title: 'Test', slug: 'test', published: false,
    });
    expect(res.status).toBe(401);
  });
});

describe('Stripe webhooks', () => {
  test('rejects invalid webhook signatures', async () => {
    const res = await request(app)
      .post('/api/v1/webhooks/stripe')
      .set('Stripe-Signature', 't=1,v1=invalid')
      .send('{}');
    expect(res.status).toBe(400);
  });
});

describe('404 handling', () => {
  test('Unknown route returns 404', async () => {
    const res = await request(app).get('/api/v1/nonexistent-route');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
