import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { AppError, errorResponse, asyncHandler, errorHandler } from '../lib/errors';

function mockReq() {
  return {} as Request;
}

function mockRes() {
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as Response;
}

const mockNext = vi.fn();

beforeEach(() => {
  mockNext.mockClear();
});

describe('AppError', () => {
  it('stores status, code, and message', () => {
    const err = new AppError(422, 'UNPROCESSABLE', 'Bad input');
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(422);
    expect(err.code).toBe('UNPROCESSABLE');
    expect(err.message).toBe('Bad input');
  });
});

describe('errorResponse', () => {
  it('creates a standard error envelope', () => {
    const body = errorResponse('INTERNAL_ERROR', 'Oops');
    expect(body).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'Oops' } });
  });
});

describe('asyncHandler', () => {
  it('wraps an async route handler so rejections reach next()', async () => {
    const handler = asyncHandler(async (_req, _res) => {
      throw new Error('async boom');
    });

    await handler(mockReq(), mockRes(), mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    const err = mockNext.mock.calls[0][0] as Error;
    expect(err.message).toBe('async boom');
  });

  it('passes through successful handlers', async () => {
    const req = mockReq();
    const res = mockRes();

    const handler = asyncHandler(async (_req, _res) => {
      _res.json({ ok: true });
    });

    await handler(req, res, mockNext);

    expect(res.json).toHaveBeenCalledWith({ ok: true });
    expect(mockNext).not.toHaveBeenCalled();
  });
});

describe('errorHandler', () => {
  it('handles AppError with its own status and code', () => {
    const res = mockRes();
    const err = new AppError(418, 'TEAPOT', 'I am a teapot');

    errorHandler(err, mockReq(), res, mockNext);

    expect(res.status).toHaveBeenCalledWith(418);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'TEAPOT', message: 'I am a teapot' },
    });
  });

  it('handles GNewsError by duck-typing name and status', () => {
    const res = mockRes();
    const err = new Error('quota hit') as Error & { status: number };
    err.name = 'GNewsError';
    err.status = 429;

    errorHandler(err, mockReq(), res, mockNext);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'NEWS_API_ERROR', message: 'quota hit' },
    });
  });

  it('handles ZodError with 400', () => {
    const res = mockRes();
    const err = new Error('validation') as Error & { issues: unknown[] };
    err.name = 'ZodError';
    err.issues = [];

    errorHandler(err, mockReq(), res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid request data.' },
    });
  });

  it('returns generic 500 for unknown errors', () => {
    const res = mockRes();
    const err = new Error('secret stack trace');

    errorHandler(err, mockReq(), res, mockNext);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' },
    });
  });
});
