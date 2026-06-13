import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { config } from '../shared/infrastructure/config/env';
import { fail, ok } from '../shared/presentation/http/response';
import { requestLogger } from '../shared/presentation/middleware/request-logger';
import { apiRouter } from './routes';
import { openApiDocument } from './swagger';

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '2mb' }));
app.use(requestLogger);

app.get('/health', (_req, res) => {
  ok(res, { status: 'ok', service: 'VivaJauh API', timestamp: new Date().toISOString() });
});

app.get('/', (_req, res) => {
  ok(res, { status: 'ok', service: 'VivaJauh API', timestamp: new Date().toISOString() });
});

app.get('/openapi.json', (_req, res) => {
  res.json(openApiDocument);
});
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.use('/api/v1', apiRouter);

app.use((_req, res) => {
  fail(res, 'Endpoint tidak ditemukan', 404, 'NOT_FOUND');
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = error instanceof Error && error.message ? error.message : 'Server sedang bermasalah';
  fail(res, message, 500, 'INTERNAL_ERROR');
});

app.listen(config.port, () => {
  console.log(`VivaJauh API running on port ${config.port}`);
});

export default app;
