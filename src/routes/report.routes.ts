import { Router } from 'express';
import type { Response } from 'express';
import { prisma } from '../config/prisma';
import { auth } from '../middlewares/auth';
import { auditLogs, conflictSummary, portfolioPack, reportSummary, toCsv } from '../services/report.service';
import { fail, ok } from '../utils/response';

export const reportRouter = Router();

reportRouter.use(auth);

async function auditDenied(userId: string | undefined, action: string) {
  if (!userId) return;
  await prisma.trAuditLog.create({
    data: {
      userId,
      action,
      targetType: 'Report',
      resultStatus: 'denied',
    },
  });
}

async function requireAdmin(userRole: string | undefined, res: Response, userId?: string, action = 'admin_access') {
  if (userRole === 'remote_admin') return true;
  await auditDenied(userId, action);
  fail(res, 'Forbidden', 403, 'FORBIDDEN');
  return false;
}

reportRouter.get('/summary', async (req, res, next) => {
  try {
    ok(res, await reportSummary());
  } catch (error) {
    next(error);
  }
});

reportRouter.get('/summary/export.csv', async (req, res, next) => {
  try {
    if (!(await requireAdmin(req.user?.role, res, req.user?.sub, 'export_report'))) return;
    const summary = await reportSummary();
    res.header('Content-Type', 'text/csv');
    res.attachment('vivajauh-report-summary.csv');
    res.send(toCsv(summary));
  } catch (error) {
    next(error);
  }
});

reportRouter.get('/portfolio', async (req, res, next) => {
  try {
    ok(res, await portfolioPack());
  } catch (error) {
    next(error);
  }
});

reportRouter.get('/portfolio/export.csv', async (req, res, next) => {
  try {
    if (!(await requireAdmin(req.user?.role, res, req.user?.sub, 'export_report'))) return;
    const portfolio = await portfolioPack();
    res.header('Content-Type', 'text/csv');
    res.attachment('vivajauh-portfolio-pack.csv');
    res.send(toCsv(portfolio));
  } catch (error) {
    next(error);
  }
});

reportRouter.get('/conflicts', async (req, res, next) => {
  try {
    if (!(await requireAdmin(req.user?.role, res, req.user?.sub, 'export_report'))) return;
    ok(res, await conflictSummary());
  } catch (error) {
    next(error);
  }
});

reportRouter.get('/audit', async (req, res, next) => {
  try {
    if (!(await requireAdmin(req.user?.role, res, req.user?.sub, 'export_report'))) return;
    ok(res, await auditLogs());
  } catch (error) {
    next(error);
  }
});
