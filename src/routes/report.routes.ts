import { Router } from 'express';
import type { Response } from 'express';
import { prisma } from '../config/prisma';
import { auth } from '../middlewares/auth';
import { auditLogs, conflictSummary, portfolioPack, reportSummary, toCsv, toExcelBuffer, toPdfBuffer } from '../services/report.service';
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

reportRouter.get('/summary/export.pdf', async (req, res, next) => {
  try {
    if (!(await requireAdmin(req.user?.role, res, req.user?.sub, 'export_report'))) return;
    const summary = await reportSummary();
    res.header('Content-Type', 'application/pdf');
    res.attachment('vivajauh-report-summary.pdf');
    await prisma.trAuditLog.create({ data: { userId: req.user!.sub, action: 'export_report_pdf', targetType: 'Report', resultStatus: 'success' } });
    res.send(await toPdfBuffer('VivaJauh Official Report', summary));
  } catch (error) {
    next(error);
  }
});

reportRouter.get('/summary/export.xls', async (req, res, next) => {
  try {
    if (!(await requireAdmin(req.user?.role, res, req.user?.sub, 'export_report'))) return;
    const summary = await reportSummary();
    await prisma.trAuditLog.create({ data: { userId: req.user!.sub, action: 'export_report_excel', targetType: 'Report', resultStatus: 'success' } });
    res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.attachment('vivajauh-report-summary.xlsx');
    res.send(toExcelBuffer('VivaJauh Official Report', summary));
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

reportRouter.get('/portfolio/export.pdf', async (req, res, next) => {
  try {
    if (!(await requireAdmin(req.user?.role, res, req.user?.sub, 'export_portfolio'))) return;
    const portfolio = await portfolioPack();
    await prisma.trAuditLog.create({ data: { userId: req.user!.sub, action: 'export_portfolio_pdf', targetType: 'Portfolio', resultStatus: 'success' } });
    res.header('Content-Type', 'application/pdf');
    res.attachment('vivajauh-portfolio-pack.pdf');
    res.send(await toPdfBuffer('VivaJauh Portfolio Pack', portfolio));
  } catch (error) {
    next(error);
  }
});

reportRouter.get('/portfolio/export.xlsx', async (req, res, next) => {
  try {
    if (!(await requireAdmin(req.user?.role, res, req.user?.sub, 'export_portfolio'))) return;
    const portfolio = await portfolioPack();
    await prisma.trAuditLog.create({ data: { userId: req.user!.sub, action: 'export_portfolio_excel', targetType: 'Portfolio', resultStatus: 'success' } });
    res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.attachment('vivajauh-portfolio-pack.xlsx');
    res.send(toExcelBuffer('VivaJauh Portfolio Pack', portfolio));
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
