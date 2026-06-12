import type { NextFunction, Request, Response } from 'express';
import { fail, ok } from '../../../../shared/presentation/http/response';
import type { LoanStatus } from '../../application/dto/loan.dto';
import type { LoanUseCases } from '../../application/use-cases/loan.use-cases';

function toApiApplication(app: NonNullable<Awaited<ReturnType<LoanUseCases['getApplication']>>>) {
  return {
    id: app.id,
    applicant_name: app.applicantName,
    applicant_member_id: app.applicantMemberId,
    target_koperasi: app.targetKoperasi,
    requested_amount: app.requestedAmount,
    purpose: app.purpose,
    tenure_months: app.tenureMonths,
    status: app.status,
    submitted_by: app.submittedBy,
    reviewed_by: app.reviewedBy,
    reviewed_at: app.reviewedAt,
    review_note: app.reviewNote,
    created_at: app.createdAt,
    updated_at: app.updatedAt,
    recommendation: app.recommendation
      ? {
          loan_application_id: app.recommendation.loanApplicationId,
          risk_level: app.recommendation.riskLevel,
          recommendation: app.recommendation.recommendation,
          summary: app.recommendation.summary,
          key_stats: app.recommendation.keyStatsJson,
          chart_data: app.recommendation.chartDataJson,
          evidence: app.recommendation.evidenceJson,
          model_provider: app.recommendation.modelProvider,
        }
      : null,
  };
}

export function createLoanControllers(loanUseCases: LoanUseCases) {
  return {
    async createApplicationController(req: Request, res: Response, next: NextFunction) {
      try {
        const app = await loanUseCases.createApplication({
          applicantName: req.body?.applicant_name,
          applicantMemberId: req.body?.applicant_member_id,
          targetKoperasi: req.body?.target_koperasi,
          requestedAmount: req.body?.requested_amount,
          purpose: req.body?.purpose,
          tenureMonths: req.body?.tenure_months,
          submittedBy: req.user!.sub,
        });
        ok(res, toApiApplication(app), 201);
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('INVALID_INPUT:')) {
          fail(res, error.message.replace('INVALID_INPUT: ', ''), 400, 'BAD_REQUEST');
          return;
        }
        next(error);
      }
    },

    async generateRecommendationController(req: Request, res: Response, next: NextFunction) {
      try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const result = await loanUseCases.generateRecommendation(id, req.user!.sub);
        if (!result) {
          fail(res, 'Loan application not found', 404, 'NOT_FOUND');
          return;
        }
        ok(res, {
          loan_application_id: result.loanApplicationId,
          risk_level: result.riskLevel,
          recommendation: result.recommendation,
          summary: result.summary,
          key_stats: result.keyStatsJson,
          chart_data: result.chartDataJson,
          evidence: result.evidenceJson,
          model_provider: result.modelProvider,
        });
      } catch (error) {
        next(error);
      }
    },

    async getApplicationController(req: Request, res: Response, next: NextFunction) {
      try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const app = await loanUseCases.getApplication(id);
        if (!app) {
          fail(res, 'Loan application not found', 404, 'NOT_FOUND');
          return;
        }
        ok(res, toApiApplication(app));
      } catch (error) {
        next(error);
      }
    },

    async listApplicationsController(req: Request, res: Response, next: NextFunction) {
      try {
        const status = req.query?.status as LoanStatus | undefined;
        const apps = await loanUseCases.listApplications(status);
        ok(res, apps.map(toApiApplication));
      } catch (error) {
        next(error);
      }
    },

    async approveApplicationController(req: Request, res: Response, next: NextFunction) {
      try {
        if (req.user?.role !== 'remote_admin') {
          fail(res, 'Forbidden', 403, 'FORBIDDEN');
          return;
        }
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const reviewNote = typeof req.body?.review_note === 'string' ? req.body.review_note : null;
        const app = await loanUseCases.approveApplication(id, req.user.sub, reviewNote);
        if (!app) {
          fail(res, 'Loan application not found', 404, 'NOT_FOUND');
          return;
        }
        ok(res, toApiApplication(app));
      } catch (error) {
        next(error);
      }
    },

    async loanHistoryController(req: Request, res: Response, next: NextFunction) {
      try {
        if (req.user?.role !== 'remote_admin') {
          fail(res, 'Forbidden', 403, 'FORBIDDEN');
          return;
        }
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const from = req.query?.from ? new Date(req.query.from as string) : undefined;
        const to = req.query?.to ? new Date(req.query.to as string) : undefined;
        const result = await loanUseCases.getLoanHistory(id, from, to);
        if (!result) {
          fail(res, 'Loan application not found', 404, 'NOT_FOUND');
          return;
        }
        ok(res, result);
      } catch (error) {
        next(error);
      }
    },

    async rejectApplicationController(req: Request, res: Response, next: NextFunction) {
      try {
        if (req.user?.role !== 'remote_admin') {
          fail(res, 'Forbidden', 403, 'FORBIDDEN');
          return;
        }
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const reviewNote = typeof req.body?.review_note === 'string' ? req.body.review_note : null;
        const app = await loanUseCases.rejectApplication(id, req.user.sub, reviewNote);
        if (!app) {
          fail(res, 'Loan application not found', 404, 'NOT_FOUND');
          return;
        }
        ok(res, toApiApplication(app));
      } catch (error) {
        next(error);
      }
    },
  };
}

export type LoanControllers = ReturnType<typeof createLoanControllers>;
