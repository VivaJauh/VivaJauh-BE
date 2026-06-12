import { Router } from 'express';
import { createAuthUseCases } from '../../modules/auth/application/use-cases/auth.use-cases';
import { prismaAuthRepository } from '../../modules/auth/infrastructure/repositories/prisma-auth.repository';
import { createAuthControllers } from '../../modules/auth/presentation/controllers/auth.controller';
import { createAuthRouter } from '../../modules/auth/presentation/routes/auth.routes';
import { createReportUseCases } from '../../modules/reports/application/use-cases/report.use-cases';
import { prismaReportRepository } from '../../modules/reports/infrastructure/repositories/prisma-report.repository';
import { createReportControllers } from '../../modules/reports/presentation/controllers/report.controller';
import { createReportRouter } from '../../modules/reports/presentation/routes/report.routes';
import { createSyncUseCases } from '../../modules/sync/application/use-cases/sync.use-cases';
import { prismaSyncRepository } from '../../modules/sync/infrastructure/repositories/prisma-sync.repository';
import { createSyncControllers } from '../../modules/sync/presentation/controllers/sync.controller';
import { createSyncRouter } from '../../modules/sync/presentation/routes/sync.routes';
import { createVerificationUseCases } from '../../modules/verification/application/use-cases/verification.use-cases';
import { prismaVerificationRepository } from '../../modules/verification/infrastructure/repositories/prisma-verification.repository';
import { createVerificationControllers } from '../../modules/verification/presentation/controllers/verification.controller';
import { createVerificationRouter } from '../../modules/verification/presentation/routes/verification.routes';
import { signToken } from '../../shared/infrastructure/security/jwt';

export const apiRouter = Router();

const authUseCases = createAuthUseCases(prismaAuthRepository, signToken);
const syncUseCases = createSyncUseCases(prismaSyncRepository);
const reportUseCases = createReportUseCases(prismaReportRepository);
const verificationUseCases = createVerificationUseCases(prismaVerificationRepository);

apiRouter.use('/auth', createAuthRouter(createAuthControllers(authUseCases)));
apiRouter.use('/sync', createSyncRouter(createSyncControllers(syncUseCases)));
apiRouter.use('/reports', createReportRouter(createReportControllers(reportUseCases)));
apiRouter.use('/verification', createVerificationRouter(createVerificationControllers(verificationUseCases)));
