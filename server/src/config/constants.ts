import dotenv from 'dotenv';
dotenv.config();

import crypto from 'crypto';

export const PORT = process.env.PORT || 5000;
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
export const MONGODB_URI = process.env.MONGODB_URI ? process.env.MONGODB_URI.trim() : '';

// JWT Secret: Must be provided via environment variable.
// In development, if missing, generate a dynamic ephemeral secret instead of using a hardcoded literal.
const getJwtSecret = (): string => {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length > 0) {
    return process.env.JWT_SECRET.trim();
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET environment variable is strictly required in production.');
  }
  console.warn('⚠️  [SECURITY WARNING] JWT_SECRET is not set in server/.env. Using ephemeral in-memory secret for this process session.');
  return crypto.randomBytes(32).toString('hex');
};

export const JWT_SECRET = getJwtSecret();
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Startup validation function ensuring required variables are defined
export const validateRequiredEnvVars = (): void => {
  const missing: string[] = [];

  if (NODE_ENV === 'production') {
    if (!process.env.MONGODB_URI || process.env.MONGODB_URI.trim().length === 0) {
      missing.push('MONGODB_URI');
    }
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim().length === 0) {
      missing.push('JWT_SECRET');
    }
    if (!process.env.CLIENT_URL || process.env.CLIENT_URL.trim().length === 0) {
      missing.push('CLIENT_URL');
    }
    if (missing.length > 0) {
      console.error(`❌ [FATAL] Missing required production environment variables: ${missing.join(', ')}`);
      process.exit(1);
    }
  } else {
    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
      console.warn('⚠️  [INFO] ADMIN_EMAIL or ADMIN_PASSWORD not set in server/.env; admin auto-creation will be skipped or prompt will be required.');
    }
  }
};

// Bootstrap & Seeding credentials: Provided strictly via environment variables
export const ADMIN_NAME = process.env.ADMIN_NAME || '';
export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
export const DEFAULT_MEMBER_PASSWORD = process.env.DEFAULT_MEMBER_PASSWORD || '';

validateRequiredEnvVars();


export const ROLES = {
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER'
} as const;

export const USER_STATUS = {
  ACTIVE: 'ACTIVE',
  DISABLED: 'DISABLED'
} as const;

export const ACCESS_LEVELS = {
  VIEW: 'VIEW',
  EDIT: 'EDIT',
  MANAGE: 'MANAGE'
} as const;

export const PROJECT_STATUS = {
  PLANNING: 'PLANNING',
  IN_PROGRESS: 'IN_PROGRESS',
  TESTING: 'TESTING',
  COMPLETED: 'COMPLETED',
  ON_HOLD: 'ON_HOLD'
} as const;

export const PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
} as const;

export const TASK_STATUS = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  REVIEW: 'REVIEW',
  DONE: 'DONE'
} as const;
