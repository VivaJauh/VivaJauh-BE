import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { config } from '../shared/infrastructure/config/env';
import { fail, ok } from '../shared/presentation/http/response';
import { apiRouter } from './routes';

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  ok(res, { status: 'ok', service: 'VivaJauh API', timestamp: new Date().toISOString() });
});

app.use('/api/v1', apiRouter);

app.use((_req, res) => {
  fail(res, 'Endpoint not found', 404, 'NOT_FOUND');
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = error instanceof Error ? error.message : 'Internal server error';
  fail(res, message, 500, 'INTERNAL_ERROR');
});

app.listen(config.port, () => {
  console.log(`VivaJauh API running on port ${config.port}`);
});

export default app;
