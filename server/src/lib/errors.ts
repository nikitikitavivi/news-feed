import type { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
  }
}

export function errorResponse(code: string, message: string): object {
  return { error: { code, message } };
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(`[ERROR] ${err.message}`, err.stack);

  if (err instanceof AppError) {
    res.status(err.status).json(errorResponse(err.code, err.message));
    return;
  }

  if (err.name === 'OpenAIError' && 'status' in err && typeof err.status === 'number') {
    res.status(err.status).json(errorResponse('OPENAI_ERROR', err.message));
    return;
  }

  if (err.name === 'GNewsError' && 'status' in err && typeof err.status === 'number') {
    res.status(err.status).json(errorResponse('NEWS_API_ERROR', err.message));
    return;
  }

  if (err.name === 'ZodError' && 'issues' in err) {
    res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid request data.'));
    return;
  }

  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json(errorResponse('PARSE_ERROR', 'Invalid JSON in request body.'));
    return;
  }

  res.status(500).json(errorResponse('INTERNAL_ERROR', 'Something went wrong.'));
}
