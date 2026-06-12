import type { GeminiLoanRecommendation, LoanKeyStats, LoanHistory } from '../../application/dto/loan.dto';

type GeminiClientInput = {
  applicantName: string;
  applicantMemberId: string | null;
  targetKoperasi: string;
  requestedAmount: number;
  purpose: string | null;
  tenureMonths: number;
  histories: LoanHistory[];
  keyStats: LoanKeyStats;
};

export type GeminiLoanRecommendationClient = {
  generate(input: GeminiClientInput): Promise<GeminiLoanRecommendation | null>;
};

const SYSTEM_PROMPT = `!!OUTPUT DALAM BAHASA INDONESIA Anda adalah asisten analisis risiko pinjaman untuk sistem manajemen koperasi Indonesia.
Tugas Anda adalah memberikan rekomendasi yang berhati-hati, bukan keputusan akhir.
Analisis riwayat pembayaran 12 bulan terakhir lintas koperasi, tunggakan yang belum diselesaikan, jumlah pinjaman yang diminta, dan tenor.
Kembalikan hanya JSON yang ketat.
Jangan mengarang fakta yang tidak ada dalam input.
Jika data tidak lengkap, sebutkan ketidakpastiannya.
Gunakan salah satu dari tingkat risiko berikut: low, medium, high.
Gunakan salah satu dari rekomendasi berikut: approve, manual_review, reject_or_require_clearance.
Tulis seluruh penjelasan, ringkasan, faktor positif, faktor negatif, dan saran dalam Bahasa Indonesia.
Keputusan akhir harus dibuat oleh secondary admin koperasi sekunder.`;

export function createGeminiLoanRecommendationClient(apiKey?: string): GeminiLoanRecommendationClient {
  return {
    async generate(input: GeminiClientInput): Promise<GeminiLoanRecommendation | null> {
      if (!apiKey) return null;

      const userPayload = {
        applicant: { name: input.applicantName, member_id: input.applicantMemberId },
        application: {
          target_koperasi: input.targetKoperasi,
          requested_amount: input.requestedAmount,
          purpose: input.purpose,
          tenure_months: input.tenureMonths,
        },
        cross_cooperative_history: input.histories.map((h) => ({
          koperasi: h.koperasi,
          status: h.status,
          total_repaid: h.totalRepaid,
          late_payments: h.latePayments,
          outstanding_arrears: h.outstandingArrears,
          recorded_at: h.recordedAt.toISOString(),
        })),
        computed_key_stats: input.keyStats,
      };

      const body = JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: JSON.stringify(userPayload) }] }],
        generation_config: { response_mime_type: 'application/json' },
      });

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.0-flash:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          signal: controller.signal,
        });

        if (!response.ok) return null;

        const json = (await response.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };

        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) return null;

        const parsed = JSON.parse(text) as GeminiLoanRecommendation;
        const validRiskLevels = ['low', 'medium', 'high'];
        const validRecommendations = ['approve', 'manual_review', 'reject_or_require_clearance'];

        if (!validRiskLevels.includes(parsed.risk_level) || !validRecommendations.includes(parsed.recommendation)) {
          return null;
        }

        return parsed;
      } catch {
        return null;
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
