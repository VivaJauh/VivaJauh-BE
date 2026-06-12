import type { NextFunction, Request, Response } from 'express';
import { fail, ok } from '../../../../shared/presentation/http/response';
import type { LoanStatus } from '../../application/dto/loan.dto';
import type { LoanUseCases } from '../../application/use-cases/loan.use-cases';

function redactEvidence(evidence: unknown): unknown {
  if (!Array.isArray(evidence)) return [];
  return evidence.map((item, index) => {
    const e = (item ?? {}) as Record<string, unknown>;
    const arrears = typeof e.outstanding_arrears === 'number' ? e.outstanding_arrears : 0;
    const late = typeof e.late_payments === 'number' ? e.late_payments : 0;
    return {
      koperasi: `Koperasi ${String.fromCharCode(65 + index)}`,
      finding:
        arrears > 0
          ? 'Terdapat tunggakan yang belum diselesaikan di koperasi lain'
          : late > 0
            ? 'Terdapat riwayat keterlambatan pembayaran'
            : 'Riwayat pembayaran lancar',
      status: typeof e.status === 'string' ? e.status : 'unknown',
    };
  });
}

function redactChartData(chartData: unknown): unknown {
  const c = (chartData ?? {}) as Record<string, unknown>;
  return { risk_factors: Array.isArray(c.risk_factors) ? c.risk_factors : [] };
}

function toApiRecommendation(
  rec: NonNullable<NonNullable<Awaited<ReturnType<LoanUseCases['getApplication']>>>['recommendation']>,
  redact: boolean,
) {
  return {
    loan_application_id: rec.loanApplicationId,
    risk_level: rec.riskLevel,
    recommendation: rec.recommendation,
    summary: rec.summary,
    key_stats: rec.keyStatsJson,
    chart_data: redact ? redactChartData(rec.chartDataJson) : rec.chartDataJson,
    evidence: redact ? redactEvidence(rec.evidenceJson) : rec.evidenceJson,
    model_provider: rec.modelProvider,
  };
}

function toApiApplication(
  app: NonNullable<Awaited<ReturnType<LoanUseCases['getApplication']>>>,
  redact: boolean,
) {
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
    recommendation: app.recommendation ? toApiRecommendation(app.recommendation, redact) : null,
  };
}

function isAdmin(req: Request): boolean {
  return req.user?.role === 'remote_admin';
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
        ok(res, toApiApplication(app, !isAdmin(req)), 201);
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
        ok(res, toApiRecommendation(result, !isAdmin(req)));
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
        ok(res, toApiApplication(app, !isAdmin(req)));
      } catch (error) {
        next(error);
      }
    },

    async listApplicationsController(req: Request, res: Response, next: NextFunction) {
      try {
        const status = req.query?.status as LoanStatus | undefined;
        const apps = await loanUseCases.listApplications(status);
        ok(res, apps.map((app) => toApiApplication(app, !isAdmin(req))));
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
        const app = await loanUseCases.approveApplication(
          id,
          req.user.sub,
          reviewNote,
          req.user.koperasi_name ?? null,
        );
        if (!app) {
          fail(res, 'Loan application not found', 404, 'NOT_FOUND');
          return;
        }
        ok(res, toApiApplication(app, false));
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('INVALID_STATE:')) {
          fail(res, error.message.replace('INVALID_STATE: ', ''), 409, 'CONFLICT');
          return;
        }
        if (error instanceof Error && error.message.startsWith('FORBIDDEN_SCOPE:')) {
          fail(res, error.message.replace('FORBIDDEN_SCOPE: ', ''), 403, 'FORBIDDEN');
          return;
        }
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
        const app = await loanUseCases.rejectApplication(
          id,
          req.user.sub,
          reviewNote,
          req.user.koperasi_name ?? null,
        );
        if (!app) {
          fail(res, 'Loan application not found', 404, 'NOT_FOUND');
          return;
        }
        ok(res, toApiApplication(app, false));
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('INVALID_STATE:')) {
          fail(res, error.message.replace('INVALID_STATE: ', ''), 409, 'CONFLICT');
          return;
        }
        if (error instanceof Error && error.message.startsWith('FORBIDDEN_SCOPE:')) {
          fail(res, error.message.replace('FORBIDDEN_SCOPE: ', ''), 403, 'FORBIDDEN');
          return;
        }
        next(error);
      }
    },
  };
}

export type LoanControllers = ReturnType<typeof createLoanControllers>;
