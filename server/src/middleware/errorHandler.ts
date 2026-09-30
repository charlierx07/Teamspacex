import { Request, Response, NextFunction } from 'express';
import { NODE_ENV } from '../config/constants.js';
import { generateCorrelationId } from '../utils/logger.js';

const sanitizeForLog = (str: string): string => {
  if (!str) return str;
  return str
    .replace(/mongodb(\+srv)?:\/\/[^@]+@/gi, 'mongodb$1://****:****@')
    .replace(/Bearer\s+[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/gi, 'Bearer [REDACTED]')
    .replace(/(password|secret|key|token)["':\s]+["']?([^"',\s]+)/gi, '$1: "[REDACTED]"');
};

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const correlationId = generateCorrelationId();
  const safeLogMessage = sanitizeForLog(err.message || '');

  // Log full details server-side only — never sent to client
  console.error(`[ERROR] [${correlationId}] ${req.method} ${req.path} — ${safeLogMessage}`);
  if (NODE_ENV !== 'production' && err.stack) {
    console.error(err.stack);
  }

  // Mongoose duplicate key — safe to expose field name
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    res.status(409).json({
      success: false,
      message: `A resource with that ${field} already exists.`,
      correlationId
    });
    return;
  }

  // Mongoose validation error — safe to expose field-level messages
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e: any) => sanitizeForLog(e.message));
    res.status(400).json({
      success: false,
      message: messages.join(', '),
      correlationId
    });
    return;
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    res.status(400).json({
      success: false,
      message: 'Invalid ID parameter format.',
      correlationId
    });
    return;
  }

  const statusCode = err.statusCode || 500;

  // In production: never expose internal error messages to clients.
  // In development: show sanitized message for easier debugging.
  const clientMessage =
    NODE_ENV === 'production'
      ? statusCode >= 500
        ? 'An internal server error occurred. Please try again later.'
        : (err.publicMessage || 'Request could not be processed.')
      : safeLogMessage || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message: clientMessage,
    correlationId
  });
};

