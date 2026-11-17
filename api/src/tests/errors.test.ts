import express from 'express';
import request from 'supertest';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import app from '../app.js';
import prisma from '../prisma.js';
import { ensureJsonBody, errorHandler, notFoundHandler } from '../middleware/errors.js';

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Global safety net on the app', () => {
  it('answers unknown routes with JSON 404', async () => {
    const response = await request(app).get('/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.body).toEqual({ error: 'Route not found' });
  });

  it('answers malformed JSON with JSON 400', async () => {
    const response = await request(app)
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":');

    expect(response.status).toBe(400);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.body).toEqual({ error: 'Malformed JSON body' });
  });

  it('rejects a JSON array body', async () => {
    const response = await request(app).post('/auth/login').send([{ email: 'a@b.lt' }]);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Request body must be a JSON object' });
  });

  it('treats a missing body as empty instead of crashing', async () => {
    const response = await request(app).post('/auth/login');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Email is required' });
  });
});

function appThatThrows(error: unknown) {
  const testApp = express();
  testApp.use(express.json());
  testApp.use(ensureJsonBody);
  testApp.get('/boom', () => {
    throw error;
  });
  testApp.use(notFoundHandler);
  testApp.use(errorHandler);
  return testApp;
}

function knownPrismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError('test', { code, clientVersion: 'test' });
}

describe('errorHandler', () => {
  it.each([
    ['P2025', 404, 'Resource not found'],
    ['P2002', 409, 'Resource already exists'],
    ['P2003', 400, 'Related resource does not exist'],
  ])('maps Prisma %s to %i', async (code, status, error) => {
    const response = await request(appThatThrows(knownPrismaError(code))).get('/boom');

    expect(response.status).toBe(status);
    expect(response.body).toEqual({ error });
  });

  it('maps Prisma validation errors to 400', async () => {
    const error = new Prisma.PrismaClientValidationError('bad data', { clientVersion: 'test' });
    const response = await request(appThatThrows(error)).get('/boom');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid request data' });
  });

  it('falls back to JSON 500 for unexpected errors', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await request(appThatThrows(new Error('kaboom'))).get('/boom');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Internal server error' });
    consoleError.mockRestore();
  });
});
