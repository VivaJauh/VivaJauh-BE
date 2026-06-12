import { Router } from 'express';
type VerificationStatus = 'unverified' | 'verified' | 'rejected' | 'needs_correction';
import { auth } from '../middlewares/auth';
import { verificationQueue, verifyRecord } from '../services/verification.service';
import { fail, ok } from '../utils/response';

export const verificationRouter = Router();

verificationRouter.use(auth);

verificationRouter.get('/queue', async (req, res, next) => {
  try {
    if (req.user?.role !== 'remote_admin') {
      fail(res, 'Forbidden', 403, 'FORBIDDEN');
      return;
    }
    ok(res, await verificationQueue());
  } catch (error) {
    next(error);
  }
});

verificationRouter.patch('/records/:id', async (req, res, next) => {
  try {
    if (req.user?.role !== 'remote_admin') {
      fail(res, 'Forbidden', 403, 'FORBIDDEN');
      return;
    }

    const verificationStatus = (req.body?.verification_status ?? 'verified') as VerificationStatus;
    const record = await verifyRecord(req.params.id, verificationStatus, req.user?.sub);
    if (!record) {
      fail(res, 'Record not found', 404, 'NOT_FOUND');
      return;
    }

    ok(res, record);
  } catch (error) {
    next(error);
  }
});
