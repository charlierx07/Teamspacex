import { Request, Response, NextFunction } from 'express';

/**
 * Recursively removes any keys starting with '$' or containing '.'
 * from objects to prevent MongoDB / NoSQL query injection attacks.
 */
function cleanNoSqlInjection(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      obj[i] = cleanNoSqlInjection(obj[i]);
    }
    return obj;
  }

  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
    } else {
      obj[key] = cleanNoSqlInjection(obj[key]);
    }
  }

  return obj;
}

export const mongoSanitizeMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (req.body) cleanNoSqlInjection(req.body);
  if (req.query) cleanNoSqlInjection(req.query);
  if (req.params) cleanNoSqlInjection(req.params);
  next();
};
