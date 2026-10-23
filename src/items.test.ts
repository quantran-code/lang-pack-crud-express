import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import app from './app';
import { resetItems } from './items';

beforeEach(resetItems);

describe('POST /items', () => {
  it('creates an item and returns 201 with the generated id', async () => {
    const res = await request(app).post('/items').send({ name: 'Widget', quantity: 3 });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(String),
      name: 'Widget',
      quantity: 3,
    });
    expect(typeof res.body.id).toBe('string');
    expect(res.body.id.length).toBeGreaterThan(0);
  });

  it('generates a distinct id for each created item', async () => {
    const first = await request(app).post('/items').send({ name: 'Widget', quantity: 1 });
    const second = await request(app).post('/items').send({ name: 'Gadget', quantity: 2 });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.id).not.toBe(second.body.id);
  });

  it('stores and echoes a provided description', async () => {
    const res = await request(app)
      .post('/items')
      .send({ name: 'Widget', description: 'A small widget', quantity: 3 });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Widget');
    expect(res.body.description).toBe('A small widget');
    expect(res.body.quantity).toBe(3);
  });

  it('omits description entirely when it is not provided', async () => {
    const created = await request(app).post('/items').send({ name: 'Widget', quantity: 3 });

    expect(created.status).toBe(201);
    expect(created.body).not.toHaveProperty('description');

    const fetched = await request(app).get(`/items/${created.body.id}`);

    expect(fetched.status).toBe(200);
    expect(fetched.body).not.toHaveProperty('description');
  });

  it('omits description when it is explicitly null', async () => {
    const res = await request(app)
      .post('/items')
      .send({ name: 'Widget', quantity: 3, description: null });

    expect(res.status).toBe(201);
    expect(res.body).not.toHaveProperty('description');
  });

  it('omits description when it is an empty string', async () => {
    const res = await request(app)
      .post('/items')
      .send({ name: 'Widget', quantity: 3, description: '' });

    expect(res.status).toBe(201);
    expect(res.body).not.toHaveProperty('description');
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app).post('/items').send({ quantity: 3 });

    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
  });

  it('returns 400 when name is an empty string', async () => {
    const res = await request(app).post('/items').send({ name: '', quantity: 3 });

    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
  });

  it('returns 400 when name is whitespace only', async () => {
    const res = await request(app).post('/items').send({ name: '   ', quantity: 3 });

    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
  });

  it('returns 400 when quantity is missing', async () => {
    const res = await request(app).post('/items').send({ name: 'Widget' });

    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
  });

  it('returns 400 when quantity is negative', async () => {
    const res = await request(app).post('/items').send({ name: 'Widget', quantity: -1 });

    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
  });

  it('returns 400 when quantity is fractional', async () => {
    const res = await request(app).post('/items').send({ name: 'Widget', quantity: 1.5 });

    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
  });

  it('returns 400 when quantity is a numeric string', async () => {
    const res = await request(app).post('/items').send({ name: 'Widget', quantity: '3' });

    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
  });

  it('returns 400 when description is not a string', async () => {
    const res = await request(app)
      .post('/items')
      .send({ name: 'Widget', quantity: 3, description: 42 });

    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
  });

  it('leaves the store empty after rejected payloads', async () => {
    await request(app).post('/items').send({ name: '', quantity: 3 });
    await request(app).post('/items').send({ name: 'Widget' });
    await request(app).post('/items').send({ name: 'Widget', quantity: 1.5 });

    const res = await request(app).get('/items');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('GET /items', () => {
  it('returns every item in creation order', async () => {
    await request(app).post('/items').send({ name: 'First', quantity: 1 });
    await request(app).post('/items').send({ name: 'Second', quantity: 2 });

    const res = await request(app).get('/items');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
    expect(res.body.map((item: { name: string }) => item.name)).toEqual(['First', 'Second']);
  });

  it('returns an empty array when the store is empty', async () => {
    const res = await request(app).get('/items');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('GET /items/:id', () => {
  it('returns the item when it exists', async () => {
    const created = await request(app)
      .post('/items')
      .send({ name: 'Widget', description: 'A small widget', quantity: 3 });

    const res = await request(app).get(`/items/${created.body.id}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(created.body);
  });

  it('returns 404 for an unknown id', async () => {
    const res = await request(app).get('/items/00000000-0000-4000-8000-000000000000');

    expect(res.status).toBe(404);
    expect(typeof res.body.error).toBe('string');
  });
});

describe('PUT /items/:id', () => {
  it('replaces the item and returns 200 with the updated fields', async () => {
    const created = await request(app)
      .post('/items')
      .send({ name: 'Widget', description: 'A small widget', quantity: 3 });

    const res = await request(app)
      .put(`/items/${created.body.id}`)
      .send({ name: 'Gadget', description: 'A big gadget', quantity: 9 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: created.body.id,
      name: 'Gadget',
      description: 'A big gadget',
      quantity: 9,
    });

    const fetched = await request(app).get(`/items/${created.body.id}`);

    expect(fetched.status).toBe(200);
    expect(fetched.body).toEqual(res.body);
  });

  it('removes description when the replacement body omits it', async () => {
    const created = await request(app)
      .post('/items')
      .send({ name: 'Widget', description: 'A small widget', quantity: 3 });

    const res = await request(app)
      .put(`/items/${created.body.id}`)
      .send({ name: 'Widget', quantity: 4 });

    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty('description');
    expect(res.body.name).toBe('Widget');
    expect(res.body.quantity).toBe(4);

    const fetched = await request(app).get(`/items/${created.body.id}`);

    expect(fetched.status).toBe(200);
    expect(fetched.body).not.toHaveProperty('description');
  });

  it('returns 404 for an unknown id', async () => {
    const res = await request(app)
      .put('/items/00000000-0000-4000-8000-000000000000')
      .send({ name: 'Gadget', quantity: 1 });

    expect(res.status).toBe(404);
    expect(typeof res.body.error).toBe('string');
  });

  it('returns 400 on an invalid body and leaves the stored item untouched', async () => {
    const created = await request(app)
      .post('/items')
      .send({ name: 'Keep', description: 'keep me', quantity: 2 });

    const missingQuantity = await request(app)
      .put(`/items/${created.body.id}`)
      .send({ name: 'Changed' });

    expect(missingQuantity.status).toBe(400);
    expect(typeof missingQuantity.body.error).toBe('string');

    const emptyName = await request(app)
      .put(`/items/${created.body.id}`)
      .send({ name: '', quantity: 5 });

    expect(emptyName.status).toBe(400);

    const badQuantity = await request(app)
      .put(`/items/${created.body.id}`)
      .send({ name: 'Changed', quantity: 1.5 });

    expect(badQuantity.status).toBe(400);

    const fetched = await request(app).get(`/items/${created.body.id}`);

    expect(fetched.status).toBe(200);
    expect(fetched.body).toEqual({
      id: created.body.id,
      name: 'Keep',
      description: 'keep me',
      quantity: 2,
    });
  });
});

describe('DELETE /items/:id', () => {
  it('removes the item, returns 204 with an empty body, and later 404s', async () => {
    const created = await request(app).post('/items').send({ name: 'Widget', quantity: 3 });

    const res = await request(app).delete(`/items/${created.body.id}`);

    expect(res.status).toBe(204);
    expect(res.text).toBe('');

    const list = await request(app).get('/items');

    expect(list.status).toBe(200);
    expect(list.body).toEqual([]);

    const fetched = await request(app).get(`/items/${created.body.id}`);

    expect(fetched.status).toBe(404);

    const secondDelete = await request(app).delete(`/items/${created.body.id}`);

    expect(secondDelete.status).toBe(404);
  });

  it('returns 404 when deleting an unknown id', async () => {
    const res = await request(app).delete('/items/00000000-0000-4000-8000-000000000000');

    expect(res.status).toBe(404);
    expect(typeof res.body.error).toBe('string');
  });
});
