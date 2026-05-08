import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { fail } from '../utils/http';

export function auth(required = true) {
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header) {
      if (!required) return next();
      return fail(res, 401, 'AUTH_REQUIRED', '请先登录');
    }
    const token = header.replace(/^Bearer\s+/i, '');
    try {
      req.user = jwt.verify(token, config.jwtSecret) as any;
      next();
    } catch {
      return fail(res, 401, 'AUTH_TOKEN_INVALID', '登录已过期，请重新登录');
    }
  };
}

export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return fail(res, 401, 'AUTH_REQUIRED', '请先登录');
    if (!roles.includes(req.user.role)) return fail(res, 403, 'AUTH_SCOPE_DENIED', '无权访问该资源');
    next();
  };
}
