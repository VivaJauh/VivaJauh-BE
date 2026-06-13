import type { NextFunction, Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import { fail, ok } from '../../../../shared/presentation/http/response';
import type { LoanAuditReport, LoanStatus } from '../../application/dto/loan.dto';
import type { LoanUseCases } from '../../application/use-cases/loan.use-cases';

const AUDIT_ACTION_LABELS: Record<string, string> = {
  loan_application_created: 'Pengajuan dibuat',
  loan_recommendation_generated: 'Rekomendasi risiko dihasilkan',
  loan_application_approved: 'Pengajuan disetujui',
  loan_application_rejected: 'Pengajuan ditolak',
  loan_audit_report_exported: 'Laporan pemeriksaan diekspor',
};

const FLAG_LABELS: Record<string, string> = {
  FAST_DECISION: 'Keputusan dibuat kurang dari 30 menit setelah pengajuan',
  RECOMMENDATION_SKIPPED: 'Keputusan dibuat tanpa rekomendasi risiko',
  HIGH_RISK_APPROVED: 'Pengajuan berisiko tinggi disetujui',
  MISSING_REVIEW_NOTE: 'Catatan keputusan kosong',
};

const VALID_LOAN_STATUSES = new Set<LoanStatus>(['draft', 'pending_review', 'approved', 'rejected']);

function maskMemberId(value: string | null): string {
  if (!value) return '-';
  if (value.length <= 4) return `${value[0]}***`;
  return `${value.slice(0, 3)}${'*'.repeat(value.length - 5)}${value.slice(-2)}`;
}

function formatDateTime(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' });
}

function renderAuditReportPdf(res: Response, report: LoanAuditReport) {
  const doc = new PDFDocument({ margin: 48, size: 'A4' });
  doc.pipe(res);

  doc.fontSize(16).font('Helvetica-Bold').text('LAPORAN PEMERIKSAAN PINJAMAN');
  doc.fontSize(10).font('Helvetica').fillColor('#555555')
    .text('Diterbitkan oleh Koperasi Sekunder melalui sistem VivaJauh');
  doc.moveDown();

  doc.fillColor('#000000').fontSize(11).font('Helvetica-Bold').text('Identitas Kasus');
  doc.fontSize(10).font('Helvetica');
  doc.text(`ID Pengajuan      : ${report.loan_application_id}`);
  doc.text(`Pemohon           : ${report.applicant_name}`);
  doc.text(`NIK / ID Anggota  : ${maskMemberId(report.applicant_member_id)}`);
  doc.text(`Koperasi Tujuan   : ${report.target_koperasi}`);
  doc.text(`Nominal           : Rp ${report.requested_amount.toLocaleString('id-ID')}`);
  doc.text(`Status            : ${report.status}`);
  doc.text(
    `Periode Pemeriksaan: ${report.period_from ? formatDateTime(report.period_from) : 'awal'} s.d. ${
      report.period_to ? formatDateTime(report.period_to) : 'sekarang'
    }`,
  );
  doc.moveDown();

  doc.fontSize(11).font('Helvetica-Bold').text('Integritas Rantai Audit');
  doc.fontSize(10).font('Helvetica');
  const integrityLabel = report.integrity.integrity === 'valid' ? 'VALID — tidak ada indikasi manipulasi' : `RUSAK pada entri ${report.integrity.broken_at_entry_id}`;
  doc.fillColor(report.integrity.integrity === 'valid' ? '#1A7F4B' : '#B3261E').text(integrityLabel);
  doc.fillColor('#000000').text(`Entri terverifikasi: ${report.integrity.checked_entries}`);
  doc.moveDown();

  doc.fontSize(11).font('Helvetica-Bold').text('Penanda Otomatis');
  doc.fontSize(10).font('Helvetica');
  if (report.flags.length === 0) {
    doc.text('Tidak ada pola mencurigakan yang terdeteksi.');
  } else {
    for (const flag of report.flags) {
      doc.fillColor('#B3261E').text(`• ${FLAG_LABELS[flag] ?? flag}`);
    }
    doc.fillColor('#000000');
  }
  doc.moveDown();

  doc.fontSize(11).font('Helvetica-Bold').text('Kronologi');
  doc.fontSize(9.5).font('Helvetica');
  for (const entry of report.timeline) {
    doc.text(
      `${formatDateTime(entry.created_at)} — ${AUDIT_ACTION_LABELS[entry.action] ?? entry.action} — oleh ${entry.actor_name} (${entry.actor_role})${
        entry.metadata.review_note ? ` — catatan: "${entry.metadata.review_note}"` : ''
      }`,
    );
  }
  doc.moveDown(2);

  doc.fontSize(8.5).fillColor('#555555');
  doc.text(`Dibuat oleh ${report.generated_by} pada ${formatDateTime(report.generated_at)}.`);
  doc.text(`SHA-256 laporan: ${report.report_hash}`);
  doc.text(
    'Dokumen ini diterbitkan tanpa memberikan akses sistem kepada pemeriksa. '
    + 'Keaslian isi dapat diverifikasi dengan mencocokkan hash di atas pada jejak audit sistem.',
  );

  doc.end();
}

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
    approval_role: app.approvalRole,
    submitted_by: app.submittedBy,
    submitter_koperasi_name: app.submitterKoperasiName,
    reviewed_by: app.reviewedBy,
    reviewed_at: app.reviewedAt,
    review_note: app.reviewNote,
    created_at: app.createdAt,
    updated_at: app.updatedAt,
    recommendation: app.recommendation ? toApiRecommendation(app.recommendation, redact) : null,
  };
}

function isAdmin(req: Request): boolean {
  return req.user?.role === 'secondary_admin';
}

function canViewApplication(
  req: Request,
  app: NonNullable<Awaited<ReturnType<LoanUseCases['getApplication']>>>,
): boolean {
  if (req.user?.role !== 'member') return true;
  return app.submittedBy === req.user.sub;
}

function canDecideApplication(
  req: Request,
  app: NonNullable<Awaited<ReturnType<LoanUseCases['getApplication']>>>,
): boolean {
  if (app.approvalRole === 'primary_admin') {
    return req.user?.role === 'primary_admin' && req.user.tenant_id === app.submitterTenantId;
  }
  return req.user?.role === 'secondary_admin';
}

function parseLoanStatus(value: unknown): LoanStatus | undefined {
  if (value === undefined) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string' || raw.trim() === '') return undefined;
  const status = raw.trim() as LoanStatus;
  if (!VALID_LOAN_STATUSES.has(status)) {
    throw new Error('INVALID_INPUT: status must be draft, pending_review, approved, or rejected');
  }
  return status;
}

function parseOptionalDate(value: unknown, field: string): Date | undefined {
  if (value === undefined) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string' || raw.trim() === '') return undefined;
  const date = new Date(raw.trim());
  if (!Number.isFinite(date.getTime())) {
    throw new Error(`INVALID_INPUT: ${field} must be a valid date-time`);
  }
  return date;
}

function validateDateRange(from?: Date, to?: Date) {
  if (from && to && from > to) {
    throw new Error('INVALID_INPUT: from must be before or equal to to');
  }
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
        const app = await loanUseCases.getApplication(id);
        if (!app || !canViewApplication(req, app)) {
          fail(res, 'Loan application not found', 404, 'NOT_FOUND');
          return;
        }
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
        if (!app || !canViewApplication(req, app)) {
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
        const status = parseLoanStatus(req.query?.status);
        const apps = await loanUseCases.listApplications({
          status,
          submittedBy: req.user?.role === 'member' ? req.user.sub : undefined,
          approvalRole: req.user?.role === 'primary_admin' || req.user?.role === 'secondary_admin'
            ? req.user.role
            : undefined,
          actorTenantId: req.user?.tenant_id,
        });
        ok(res, apps.map((app) => toApiApplication(app, !isAdmin(req))));
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('INVALID_INPUT:')) {
          fail(res, error.message.replace('INVALID_INPUT: ', ''), 400, 'BAD_REQUEST');
          return;
        }
        next(error);
      }
    },

    async approveApplicationController(req: Request, res: Response, next: NextFunction) {
      try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const existing = await loanUseCases.getApplication(id);
        if (!existing) {
          fail(res, 'Loan application not found', 404, 'NOT_FOUND');
          return;
        }
        if (!canDecideApplication(req, existing)) {
          fail(res, 'Forbidden', 403, 'FORBIDDEN');
          return;
        }
        const reviewNote = typeof req.body?.review_note === 'string' ? req.body.review_note : null;
        const app = await loanUseCases.approveApplication(
          id,
          req.user.sub,
          reviewNote,
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
        next(error);
      }
    },

    async loanHistoryController(req: Request, res: Response, next: NextFunction) {
      try {
        if (req.user?.role !== 'secondary_admin') {
          fail(res, 'Forbidden', 403, 'FORBIDDEN');
          return;
        }
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const from = parseOptionalDate(req.query?.from, 'from');
        const to = parseOptionalDate(req.query?.to, 'to');
        validateDateRange(from, to);
        const result = await loanUseCases.getLoanHistory(id, from, to);
        if (!result) {
          fail(res, 'Loan application not found', 404, 'NOT_FOUND');
          return;
        }
        ok(res, result);
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('INVALID_INPUT:')) {
          fail(res, error.message.replace('INVALID_INPUT: ', ''), 400, 'BAD_REQUEST');
          return;
        }
        next(error);
      }
    },

    async verifyLoanHistoryController(req: Request, res: Response, next: NextFunction) {
      try {
        if (req.user?.role !== 'secondary_admin') {
          fail(res, 'Forbidden', 403, 'FORBIDDEN');
          return;
        }
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const result = await loanUseCases.verifyHistory(id);
        if (!result) {
          fail(res, 'Loan application not found', 404, 'NOT_FOUND');
          return;
        }
        ok(res, result);
      } catch (error) {
        next(error);
      }
    },

    async exportLoanHistoryController(req: Request, res: Response, next: NextFunction) {
      try {
        if (req.user?.role !== 'secondary_admin') {
          fail(res, 'Forbidden', 403, 'FORBIDDEN');
          return;
        }
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const from = parseOptionalDate(req.query?.from, 'from');
        const to = parseOptionalDate(req.query?.to, 'to');
        validateDateRange(from, to);
        const report = await loanUseCases.exportHistoryReport(
          id,
          { id: req.user.sub, name: req.user.name },
          from,
          to,
        );
        if (!report) {
          fail(res, 'Loan application not found', 404, 'NOT_FOUND');
          return;
        }
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="laporan-audit-${report.loan_application_id}.pdf"`,
        );
        renderAuditReportPdf(res, report);
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('INVALID_INPUT:')) {
          fail(res, error.message.replace('INVALID_INPUT: ', ''), 400, 'BAD_REQUEST');
          return;
        }
        next(error);
      }
    },

    async rejectApplicationController(req: Request, res: Response, next: NextFunction) {
      try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const existing = await loanUseCases.getApplication(id);
        if (!existing) {
          fail(res, 'Loan application not found', 404, 'NOT_FOUND');
          return;
        }
        if (!canDecideApplication(req, existing)) {
          fail(res, 'Forbidden', 403, 'FORBIDDEN');
          return;
        }
        const reviewNote = typeof req.body?.review_note === 'string' ? req.body.review_note : null;
        const app = await loanUseCases.rejectApplication(
          id,
          req.user.sub,
          reviewNote,
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
        next(error);
      }
    },
  };
}

export type LoanControllers = ReturnType<typeof createLoanControllers>;
