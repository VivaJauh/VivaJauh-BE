import { Router } from 'express';
import { auth } from '../../../../shared/presentation/middleware/auth';
import type { ReportControllers } from '../controllers/report.controller';

export function createReportRouter(controllers: ReportControllers) {
  const reportRouter = Router();

  reportRouter.use(auth);
  reportRouter.get('/summary', controllers.reportSummaryController);
  reportRouter.get('/summary/export.csv', controllers.exportSummaryCsvController);
  reportRouter.get('/summary/export.pdf', controllers.exportSummaryPdfController);
  reportRouter.get('/summary/export.xls', controllers.exportSummaryExcelController);
  reportRouter.get('/portfolio', controllers.portfolioPackController);
  reportRouter.get('/portfolio/export.csv', controllers.exportPortfolioCsvController);
  reportRouter.get('/portfolio/export.pdf', controllers.exportPortfolioPdfController);
  reportRouter.get('/portfolio/export.xlsx', controllers.exportPortfolioExcelController);
  reportRouter.get('/conflicts', controllers.conflictSummaryController);
  reportRouter.get('/audit', controllers.auditLogsController);

  return reportRouter;
}
