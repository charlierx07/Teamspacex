import crypto from 'crypto';
import { NODE_ENV } from '../config/constants.js';

/**
 * Centralized server logger.
 * In production, only error/warn reach console. Debug/info are suppressed.
 * Never log raw user data, tokens, or credentials.
 */
export const logger = {
  info: (message: string, ...args: any[]): void => {
    if (NODE_ENV !== 'production') {
      console.log(`[INFO]  ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: any[]): void => {
    console.warn(`[WARN]  ${message}`, ...args);
  },
  error: (message: string, ...args: any[]): void => {
    console.error(`[ERROR] ${message}`, ...args);
  },
  startup: (message: string): void => {
    console.log(message);
  }
};

/**
 * Generates a short correlation ID for error tracking without exposing internal details.
 */
export const generateCorrelationId = (): string => {
  return crypto.randomBytes(6).toString('hex').toUpperCase();
};
