import { Router } from 'express';
import { createAuthUseCases } from '../../modules/auth/application/use-cases/auth.use-cases';
import { prismaAuthRepository } from '../../modules/auth/infrastructure/repositories/prisma-auth.repository';
import { createAuthControllers } from '../../modules/auth/presentation/controllers/auth.controller';
import { createAuthRouter } from '../../modules/auth/presentation/routes/auth.routes';
import { createLoanUseCases } from '../../modules/loans/application/use-cases/loan.use-cases';
import { createGeminiLoanRecommendationClient } from '../../modules/loans/infrastructure/ai/gemini-loan-recommendation.client';
import { prismaLoanRepository } from '../../modules/loans/infrastructure/repositories/prisma-loan.repository';
import { createLoanControllers } from '../../modules/loans/presentation/controllers/loan.controller';
import { createLoanRouter } from '../../modules/loans/presentation/routes/loan.routes';
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
import { config } from '../../shared/infrastructure/config/env';
import { signToken } from '../../shared/infrastructure/security/jwt';

export const apiRouter = Router();

const authUseCases = createAuthUseCases(prismaAuthRepository, signToken);
const syncUseCases = createSyncUseCases(prismaSyncRepository);
const reportUseCases = createReportUseCases(prismaReportRepository);
const verificationUseCases = createVerificationUseCases(prismaVerificationRepository);
const geminiClient = createGeminiLoanRecommendationClient(config.geminiApiKey);
const loanUseCases = createLoanUseCases(prismaLoanRepository, geminiClient);

apiRouter.use('/auth', createAuthRouter(createAuthControllers(authUseCases)));
apiRouter.use('/sync', createSyncRouter(createSyncControllers(syncUseCases)));
apiRouter.use('/reports', createReportRouter(createReportControllers(reportUseCases)));
apiRouter.use('/verification', createVerificationRouter(createVerificationControllers(verificationUseCases)));
apiRouter.use('/loans', createLoanRouter(createLoanControllers(loanUseCases)));
