import type { NextFunction, Request, Response } from 'express';

const SENSITIVE_KEYS = ['authorization', 'password', 'token', 'device_token', 'deviceToken'];

function maskSensitive(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(maskSensitive);

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
      const lower = key.toLowerCase();
      if (SENSITIVE_KEYS.some((sensitive) => lower.includes(sensitive.toLowerCase()))) {
        return [key, '***'];
      }
      return [key, maskSensitive(entry)];
    }),
  );
}

function preview(value: unknown) {
  const text = JSON.stringify(maskSensitive(value));
  return text.length > 300 ? `${text.slice(0, 300)}...` : text;
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  let responseBody: unknown;
  const originalJson = res.json.bind(res);

  res.json = (body: unknown) => {
    responseBody = body;
    return originalJson(body);
  };

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const level = status >= 500 ? 'ERROR' : status >= 400 ? 'WARN' : 'INFO';
    const parts = [
      `[${level}]`,
      req.method.padEnd(6),
      String(status),
      req.originalUrl,
      `${duration}ms`,
    ];

    console.log(parts.join(' '));

    if (Object.keys(req.params).length > 0) {
      console.log(`  req.params ${preview(req.params)}`);
    }
    if (Object.keys(req.query).length > 0) {
      console.log(`  req.query  ${preview(req.query)}`);
    }
    if (req.body && Object.keys(req.body as Record<string, unknown>).length > 0) {
      console.log(`  req.body   ${preview(req.body)}`);
    }
    if (responseBody !== undefined) {
      console.log(`  res.body   ${preview(responseBody)}`);
    }
  });

  next();
}
