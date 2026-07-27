import type {
  ProcessStep,
  ProcessingStatus,
  PublicReport,
  ReporterDraft,
  TriageAssessment,
} from "../types/report";
import { toPublicLocationLabel } from "./map-service";
import { delay } from "./mock-config";
import { SupabaseRestError, isSupabaseConfigured, sbRest } from "./supabase-client";

/**
 * 제보 접수·조회 서비스 adapter.
 * 실제 백엔드가 연결되면 이 구현만 교체한다. (mock: localStorage 보관)
 *
 * 개인정보 최소화:
 * - 조회용 PublicReport에는 정확한 좌표를 포함하지 않는다.
 * - mock 저장소에도 공개 라벨만 저장한다.
 */

const STORAGE_KEY = "doglink.reports.v1";

export const TIMELINE_LABELS: { id: string; label: string }[] = [
  { id: "submitted", label: "제보됨" },
  { id: "triaged", label: "AI 판정" },
  { id: "reviewing", label: "확인 중" },
  { id: "transferred", label: "기관 전달" },
  { id: "dispatched", label: "출동 또는 보호" },
  { id: "closed", label: "반환 또는 종결" },
];

const STATUS_TO_STEP_INDEX: Record<ProcessingStatus, number> = {
  submitted: 0,
  triaged: 1,
  reviewing: 2,
  transferred: 3,
  dispatched: 4,
  protected: 4,
  returned: 5,
  negative_closed: 5,
  closed: 5,
};

export class ReportNotFoundError extends Error {}

/** 접수번호: 지역 접두어 + 무작위 4자리 (단순 증가 숫자 금지) */
function generateReportId(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `JJ-${num}`;
}

function buildTimeline(
  status: ProcessingStatus,
  stamps: Record<string, string>,
): ProcessStep[] {
  const currentIdx = STATUS_TO_STEP_INDEX[status];
  return TIMELINE_LABELS.map((step, i) => ({
    id: step.id,
    label: step.label,
    status: i < currentIdx ? "completed" : i === currentIdx ? "current" : "upcoming",
    timestamp: stamps[step.id],
  }));
}

interface StoredReport extends PublicReport {
  /** mock 전용: 단계별 타임스탬프 */
  stamps: Record<string, string>;
}

function loadAll(): Record<string, StoredReport> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, StoredReport>) : {};
  } catch {
    return {};
  }
}

function saveAll(reports: Record<string, StoredReport>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

export interface SubmitResult {
  reportId: string;
}

export interface ReportService {
  /** 제보 접수. AI 판정 결과와 무관하게 항상 성공적으로 기록을 남긴다. */
  submit(
    draft: ReporterDraft,
    triage: TriageAssessment,
    options?: { emergencyReported?: boolean },
  ): Promise<SubmitResult>;
  getPublicReport(reportId: string): Promise<PublicReport>;
}

const mockReportService: ReportService = {
  async submit(draft, triage, options) {
    await delay(400);
    const reports = loadAll();
    let reportId = generateReportId();
    while (reports[reportId]) reportId = generateReportId();

    const now = new Date().toISOString();
    const emergencyReported = options?.emergencyReported ?? false;

    const status: ProcessingStatus = emergencyReported
      ? "transferred"
      : triage.type === "unavailable"
        ? "submitted"
        : "reviewing";

    const stamps: Record<string, string> = { submitted: now };
    if (triage.type !== "unavailable") stamps.triaged = triage.analyzedAt ?? now;
    if (status === "reviewing") stamps.reviewing = now;
    if (emergencyReported) {
      stamps.reviewing = now;
      stamps.transferred = now;
    }

    const report: StoredReport = {
      reportId,
      submittedAt: now,
      updatedAt: now,
      triage,
      processingStatus: status,
      timeline: buildTimeline(status, stamps),
      publicLocationLabel: draft.location
        ? toPublicLocationLabel(draft.location.address)
        : "위치 정보 없음",
      publicLocationRadiusMeters: 500,
      emergencyReported,
      stamps,
    };

    reports[reportId] = report;
    saveAll(reports);
    return { reportId };
  },

  async getPublicReport(reportId) {
    await delay(350);
    const report = loadAll()[reportId.trim().toUpperCase()];
    if (!report) {
      throw new ReportNotFoundError(
        "해당 접수번호의 제보를 찾지 못했어요. 번호를 다시 확인해 주세요.",
      );
    }
    const { stamps, ...publicReport } = report;
    return {
      ...publicReport,
      timeline: buildTimeline(report.processingStatus, stamps),
    };
  },
};

/* ------------------------------------------------------------------ */
/* Supabase adapter — 환경 변수 설정 시 mock 대신 사용된다               */
/* ------------------------------------------------------------------ */

/** 콘솔·시민이 공유하는 처리 단계 → 타임라인 step id */
function stepIdOf(status: ProcessingStatus): string {
  switch (status) {
    case "submitted":
      return "submitted";
    case "triaged":
      return "triaged";
    case "reviewing":
      return "reviewing";
    case "transferred":
      return "transferred";
    case "dispatched":
    case "protected":
      return "dispatched";
    case "returned":
    case "negative_closed":
    case "closed":
      return "closed";
  }
}

interface PublicReportRow {
  report_id: string;
  submitted_at: string;
  updated_at: string;
  triage_type: string;
  triage_summary: string;
  triage_analyzed_at: string | null;
  processing_status: ProcessingStatus;
  public_location_label: string;
  public_radius_m: number;
  emergency_reported: boolean;
  stamps: Record<string, string> | null;
}

const supabaseReportService: ReportService = {
  async submit(draft, triage, options) {
    const now = new Date().toISOString();
    const emergencyReported = options?.emergencyReported ?? false;
    // 운영자 콘솔이 '확인 시작'부터 처리하도록 접수 상태로 저장한다
    const status: ProcessingStatus = emergencyReported ? "transferred" : "submitted";

    const stamps: Record<string, string> = { submitted: now };
    if (triage.type !== "unavailable") stamps.triaged = triage.analyzedAt ?? now;
    if (emergencyReported) {
      stamps.reviewing = now;
      stamps.transferred = now;
    }

    const photos = draft.photos
      .filter((p) => p.status === "uploaded" && p.remoteUrl?.startsWith("http"))
      .map((p) => ({ url: p.remoteUrl }));

    // 접수번호 충돌 시 재생성 (PK 유니크 위반 → PostgREST 409)
    for (let attempt = 0; attempt < 6; attempt++) {
      const reportId = generateReportId();
      try {
        await sbRest("/reports", {
          method: "POST",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({
            report_id: reportId,
            submitted_at: now,
            updated_at: now,
            triage_type: triage.type,
            triage_summary: triage.summary,
            triage_analyzed_at: triage.analyzedAt ?? null,
            processing_status: status,
            latitude: draft.location?.latitude ?? null,
            longitude: draft.location?.longitude ?? null,
            address: draft.location?.address ?? null,
            location_source: draft.location?.source ?? null,
            public_location_label: draft.location
              ? toPublicLocationLabel(draft.location.address)
              : "위치 정보 없음",
            public_radius_m: 500,
            situations: draft.situations,
            description: draft.description,
            photos,
            emergency_reported: emergencyReported,
            stamps,
          }),
        });
      } catch (err) {
        if (err instanceof SupabaseRestError && err.status === 409) continue;
        throw new Error("접수 처리 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.");
      }
      // 접수 자체는 성공 — 이벤트 로그 기록 실패가 접수를 막지 않도록 분리
      try {
        await sbRest("/report_events", {
          method: "POST",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({
            report_id: reportId,
            action: "report_created",
            actor_name: "DOG-LINK 시스템",
            reason: emergencyReported
              ? "응급 자동신고 — 시민 확인 후 자동 접수"
              : "시민 제보 접수",
            occurred_at: now,
          }),
        });
      } catch {
        // 감사 로그는 운영자 콘솔 동기화 시 stamps로 재구성 가능
      }
      return { reportId };
    }
    throw new Error("접수번호 생성에 실패했어요. 다시 시도해 주세요.");
  },

  async getPublicReport(reportId) {
    // 공개 뷰만 조회 — 정확 좌표·주소는 응답에 포함되지 않는다
    let rows: PublicReportRow[] | null;
    try {
      rows = await sbRest<PublicReportRow[]>(
        `/reports_public?report_id=eq.${encodeURIComponent(reportId.trim().toUpperCase())}&limit=1`,
      );
    } catch {
      throw new Error("상태를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
    const data = rows?.[0];
    if (!data) {
      throw new ReportNotFoundError(
        "해당 접수번호의 제보를 찾지 못했어요. 번호를 다시 확인해 주세요.",
      );
    }
    const triageType = (
      ["emergency", "dispatch", "negative", "unavailable"].includes(data.triage_type)
        ? data.triage_type
        : "unavailable"
    ) as TriageAssessment["type"];
    return {
      reportId: data.report_id,
      submittedAt: data.submitted_at,
      updatedAt: data.updated_at,
      triage: {
        type: triageType,
        summary: data.triage_summary,
        analyzedAt: data.triage_analyzed_at ?? undefined,
        isHumanReviewed: data.processing_status !== "submitted",
      },
      processingStatus: data.processing_status,
      timeline: buildTimeline(data.processing_status, data.stamps ?? {}),
      publicLocationLabel: data.public_location_label,
      publicLocationRadiusMeters: data.public_radius_m,
      emergencyReported: data.emergency_reported,
    };
  },
};

export { stepIdOf };

export const reportService: ReportService = isSupabaseConfigured
  ? supabaseReportService
  : mockReportService;

/**
 * 운영자 콘솔 mock이 시민 접수 건을 큐로 인제스트할 때 사용한다.
 * 공개 데이터만 반환하므로 정확 좌표는 포함되지 않는다. (mock 한계 — 문서 참고)
 */
export function listPublicReports(): PublicReport[] {
  return Object.values(loadAll()).map(({ stamps, ...publicReport }) => ({
    ...publicReport,
    timeline: buildTimeline(publicReport.processingStatus, stamps),
  }));
}

/* ------------------------------------------------------------------ */
/* 운영자 콘솔 → 시민 상태 확인(S7) 동기화 계약                          */
/* ------------------------------------------------------------------ */

export interface PublicReportSyncInput {
  reportId: string;
  submittedAt: string;
  updatedAt: string;
  triage: TriageAssessment;
  processingStatus: ProcessingStatus;
  /** 정확 좌표가 아닌 공개용 위치 범위 라벨만 전달해야 한다. */
  publicLocationLabel: string;
  emergencyReported?: boolean;
  /** 단계 id(submitted/triaged/reviewing/transferred/dispatched/closed)별 타임스탬프 */
  stamps: Record<string, string>;
}

/**
 * 운영자 상태 변경을 시민 공개 저장소에 반영한다.
 * 실제 백엔드에서는 상태 변경 트랜잭션에 포함되는 공용 데이터 갱신에 해당한다.
 * 정확 좌표·담당자 개인정보는 이 계약을 통과하지 않는다.
 */
export function syncPublicReport(input: PublicReportSyncInput): void {
  const reports = loadAll();
  const existing = reports[input.reportId];
  reports[input.reportId] = {
    reportId: input.reportId,
    submittedAt: input.submittedAt,
    updatedAt: input.updatedAt,
    triage: input.triage,
    processingStatus: input.processingStatus,
    timeline: buildTimeline(input.processingStatus, input.stamps),
    publicLocationLabel: input.publicLocationLabel,
    publicLocationRadiusMeters: existing?.publicLocationRadiusMeters ?? 500,
    emergencyReported: input.emergencyReported ?? existing?.emergencyReported,
    stamps: input.stamps,
  };
  saveAll(reports);
}
