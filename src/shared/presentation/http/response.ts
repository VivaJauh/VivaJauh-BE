import type { Response } from 'express';

export function ok(res: Response, data: unknown, status = 200) {
  res.status(status).json({ success: true, data });
}

export function fail(res: Response, message: string, status = 400, code = 'BAD_REQUEST') {
  res.status(status).json({ success: false, code, message });
}
