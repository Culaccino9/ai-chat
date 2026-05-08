import type { Response } from 'express';
export function ok(res: Response, data: unknown = null, message = 'success') {
  return res.json({ code: 'OK', message, data, requestId: res.locals.requestId });
}
export function fail(res: Response, status: number, code: string, message: string, details?: unknown) {
  return res.status(status).json({ code, message, details, requestId: res.locals.requestId });
}
export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}
