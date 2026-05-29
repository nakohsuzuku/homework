import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error('Error:', err);
  
  res.status(500).json({
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
}

export function notFound(req: Request, res: Response) {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
  });
}