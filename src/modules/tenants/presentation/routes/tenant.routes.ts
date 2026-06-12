import { Router } from 'express';
import { auth } from '../../../../shared/presentation/middleware/auth';
import type { TenantControllers } from '../controllers/tenant.controller';

export function createTenantRouter(controllers: TenantControllers) {
  const tenantRouter = Router();

  tenantRouter.use(auth);
  tenantRouter.get('/members', controllers.listMembersController);
  tenantRouter.get('/members/:userId/records', controllers.memberRecordsController);
  tenantRouter.get('/summary', controllers.koperasiSummariesController);
  tenantRouter.get('/:tenantId/records', controllers.tenantRecordsController);

  return tenantRouter;
}
