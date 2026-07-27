import type {
  ProcessStep,
  ProcessingStatus,
  PublicReport,
  ReporterDraft,
  TriageAssessment,
} from "../types/report";
import { toPublicLocationLabel } from "./map-service";
import { delay } from "./mock-config";

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

export const reportService: ReportService = mockReportService;

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
