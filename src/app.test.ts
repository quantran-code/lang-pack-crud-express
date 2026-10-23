import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from './app';

describe('GET /health', () => {
  it('returns ok status', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', service: 'lang-pack-crud-express' });
  });
});

describe('unknown route', () => {
  it('returns 404', async () => {
    const res = await request(app).get('/does-not-exist');

    expect(res.status).toBe(404);
  });
});
