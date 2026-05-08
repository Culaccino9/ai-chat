import type { NextFunction, Request, Response } from 'express';
import { nanoid } from 'nanoid';
export function requestId(req: Request, res: Response, next: NextFunction) {
  res.locals.requestId = req.headers['x-request-id'] || `req_${nanoid(10)}`;
  res.setHeader('x-request-id', res.locals.requestId);
  next();
}
