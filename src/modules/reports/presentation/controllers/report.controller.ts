import type { NextFunction, Request, Response } from 'express';
import { fail, ok } from '../../../../shared/presentation/http/response';
import type { ReportUseCases } from '../../application/use-cases/report.use-cases';
import { toCsv, toExcelBuffer, toPdfBuffer } from '../export/report-export';

export function createReportControllers(reportUseCases: ReportUseCases) {
  async function requireAdmin(userRole: string | undefined, res: Response, userId?: string, action = 'admin_access') {
    if (userRole === 'secondary_admin') return true;
    await reportUseCases.auditDenied(userId, action);
    fail(res, 'Forbidden', 403, 'FORBIDDEN');
    return false;
  }

  return {
    async reportSummaryController(_req: Request, res: Response, next: NextFunction) {
      try {
        ok(res, await reportUseCases.reportSummary());
      } catch (error) {
        next(error);
      }
    },

    async exportSummaryCsvController(req: Request, res: Response, next: NextFunction) {
      try {
        if (!(await requireAdmin(req.user?.role, res, req.user?.sub, 'export_report'))) return;
        const summary = await reportUseCases.reportSummary();
        res.header('Content-Type', 'text/csv');
        res.attachment('vivajauh-report-summary.csv');
        res.send(toCsv(summary));
      } catch (error) {
        next(error);
      }
    },

    async exportSummaryPdfController(req: Request, res: Response, next: NextFunction) {
      try {
        if (!(await requireAdmin(req.user?.role, res, req.user?.sub, 'export_report'))) return;
        const summary = await reportUseCases.reportSummary();
        res.header('Content-Type', 'application/pdf');
        res.attachment('vivajauh-report-summary.pdf');
        await reportUseCases.auditExportSuccess(req.user!.sub, 'export_report_pdf', 'Report');
        res.send(await toPdfBuffer('VivaJauh Official Report', summary));
      } catch (error) {
        next(error);
      }
    },

    async exportSummaryExcelController(req: Request, res: Response, next: NextFunction) {
      try {
        if (!(await requireAdmin(req.user?.role, res, req.user?.sub, 'export_report'))) return;
        const summary = await reportUseCases.reportSummary();
        await reportUseCases.auditExportSuccess(req.user!.sub, 'export_report_excel', 'Report');
        res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.attachment('vivajauh-report-summary.xlsx');
        res.send(toExcelBuffer('VivaJauh Official Report', summary));
      } catch (error) {
        next(error);
      }
    },

    async portfolioPackController(_req: Request, res: Response, next: NextFunction) {
      try {
        ok(res, await reportUseCases.portfolioPack());
      } catch (error) {
        next(error);
      }
    },

    async exportPortfolioCsvController(req: Request, res: Response, next: NextFunction) {
      try {
        if (!(await requireAdmin(req.user?.role, res, req.user?.sub, 'export_report'))) return;
        const portfolio = await reportUseCases.portfolioPack();
        res.header('Content-Type', 'text/csv');
        res.attachment('vivajauh-portfolio-pack.csv');
        res.send(toCsv(portfolio));
      } catch (error) {
        next(error);
      }
    },

    async exportPortfolioPdfController(req: Request, res: Response, next: NextFunction) {
      try {
        if (!(await requireAdmin(req.user?.role, res, req.user?.sub, 'export_portfolio'))) return;
        const portfolio = await reportUseCases.portfolioPack();
        await reportUseCases.auditExportSuccess(req.user!.sub, 'export_portfolio_pdf', 'Portfolio');
        res.header('Content-Type', 'application/pdf');
        res.attachment('vivajauh-portfolio-pack.pdf');
        res.send(await toPdfBuffer('VivaJauh Portfolio Pack', portfolio));
      } catch (error) {
        next(error);
      }
    },

    async exportPortfolioExcelController(req: Request, res: Response, next: NextFunction) {
      try {
        if (!(await requireAdmin(req.user?.role, res, req.user?.sub, 'export_portfolio'))) return;
        const portfolio = await reportUseCases.portfolioPack();
        await reportUseCases.auditExportSuccess(req.user!.sub, 'export_portfolio_excel', 'Portfolio');
        res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.attachment('vivajauh-portfolio-pack.xlsx');
        res.send(toExcelBuffer('VivaJauh Portfolio Pack', portfolio));
      } catch (error) {
        next(error);
      }
    },

    async conflictSummaryController(req: Request, res: Response, next: NextFunction) {
      try {
        if (!(await requireAdmin(req.user?.role, res, req.user?.sub, 'export_report'))) return;
        ok(res, await reportUseCases.conflictSummary());
      } catch (error) {
        next(error);
      }
    },

    async auditLogsController(req: Request, res: Response, next: NextFunction) {
      try {
        if (!(await requireAdmin(req.user?.role, res, req.user?.sub, 'export_report'))) return;
        ok(res, await reportUseCases.auditLogs());
      } catch (error) {
        next(error);
      }
    },
  };
}

export type ReportControllers = ReturnType<typeof createReportControllers>;
