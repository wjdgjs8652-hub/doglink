import { delay, generateId } from "../../services/mock-config";
import {
  listPublicReports,
  syncPublicReport,
} from "../../services/report-service";
import { toPublicLocationLabel } from "../../services/map-service";
import type { TriageAssessment, TriageType } from "../../types/report";
import type {
  AuditActor,
  AuditLogEntry,
  MatchDecision,
  OperatorRealtimeEvent,
  OperatorReport,
  OperatorStatus,
  OperatorSummary,
  OperatorTriage,
  ClosureRecord,
  TriageOverrideReason,
} from "../types";
import {
  OPERATOR_STATUS_LABELS,
  TRIAGE_LABELS,
  canTransition,
} from "../domain/report-machine";
import { SYSTEM_ACTOR, buildSeedReports } from "./seed-data";
import { PHOTO_TONES, mockDogPhotoUri } from "./mock-photos";

/**
 * 운영자 제보 처리 서비스 adapter (mock).
 *
 * 실제 백엔드가 연결되면 이 파일의 mock 구현만 교체한다.
 * - 상태 변경·판정 번복·병합·종결은 감사 로그와 함께 하나의 commit으로
 *   원자적으로 처리한다. (mock: 동기 메모리 커밋 + localStorage 저장)
 * - 상태 변경은 시민 상태 확인 페이지(S7) 공용 데이터로 동기화된다.
 * - 실시간 유입은 mock event stream으로 시뮬레이션한다. (docs/operator-mock-api.md)
 */

const STORAGE_KEY = "doglink.operator.reports.v1";
const REALTIME_FLAG_KEY = "doglink.operator.realtime.injected.v1";
/** 데모 데이터가 지나치게 오래되면 상대 시간이 무의미해지므로 재시드한다. */
const RESEED_AFTER_MS = 12 * 60 * 60 * 1000;

export class OperatorReportNotFoundError extends Error {}
export class TransitionNotAllowedError extends Error {}
export class ValidationError extends Error {}

/* ------------------------------------------------------------------ */
/* 저장소                                                               */
/* ------------------------------------------------------------------ */

interface StoredState {
  seededAt: string;
  reports: OperatorReport[];
  /** 보고서 내보내기 감사 기록 (사건 단위가 아닌 시스템 단위) */
  exportLog: AuditLogEntry[];
}

let state: StoredState | null = null;
let cachedList: OperatorReport[] = [];

const storeSubscribers = new Set<() => void>();
const eventSubscribers = new Set<(event: OperatorRealtimeEvent) => void>();

function persist(): void {
  if (!state) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* 저장 실패는 mock에서 치명적이지 않음 */
  }
}

function rebuildCache(): void {
  cachedList = state ? [...state.reports] : [];
}

function notify(): void {
  rebuildCache();
  for (const cb of storeSubscribers) cb();
}

function emit(event: OperatorRealtimeEvent): void {
  for (const cb of eventSubscribers) cb(event);
}

function loadState(): StoredState {
  if (state) return state;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredState;
      if (
        parsed.seededAt &&
        Date.now() - new Date(parsed.seededAt).getTime() < RESEED_AFTER_MS
      ) {
        state = parsed;
      }
    }
  } catch {
    state = null;
  }
  if (!state) {
    state = {
      seededAt: new Date().toISOString(),
      reports: buildSeedReports(new Date()),
      exportLog: [],
    };
  }
  ingestCitizenReports();
  persist();
  rebuildCache();
  return state;
}

/** 시민 서비스에서 접수된 제보를 운영자 큐로 인제스트한다. */
function ingestCitizenReports(): void {
  if (!state) return;
  const known = new Set(state.reports.map((r) => r.reportId));
  for (const publicReport of listPublicReports()) {
    if (known.has(publicReport.reportId)) continue;
    const triageType: OperatorTriage = publicReport.triage.type;
    state.reports.push({
      reportId: publicReport.reportId,
      submittedAt: publicReport.submittedAt,
      updatedAt: publicReport.updatedAt,
      photos: [],
      /*
       * mock 한계: 시민 mock 저장소는 개인정보 최소화를 위해 정확 좌표를
       * 보관하지 않는다. 실제 백엔드에서는 권한 있는 운영자 API가
       * 정확 좌표를 제공한다. (docs/operator-mock-api.md)
       */
      location: {
        latitude: 33.4996 + (Math.random() - 0.5) * 0.05,
        longitude: 126.5312 + (Math.random() - 0.5) * 0.05,
        address: `${publicReport.publicLocationLabel} (정확 좌표 미제공 · mock)`,
      },
      reporterContext: { situationTags: [] },
      triage: {
        originalType: triageType,
        currentType: triageType,
        summary: publicReport.triage.summary,
        analyzedAt: publicReport.triage.analyzedAt,
      },
      status:
        publicReport.processingStatus === "triaged"
          ? "submitted"
          : publicReport.processingStatus,
      timeline: [
        {
          id: `${publicReport.reportId}-ev-submitted`,
          status: "submitted",
          occurredAt: publicReport.submittedAt,
          actor: SYSTEM_ACTOR,
        },
      ],
      isEmergencyAutoSubmitted: publicReport.emergencyReported ?? false,
      matchCandidates: [],
      linkedReportIds: [],
      mergedReportIds: [],
      auditLog: [
        {
          id: generateId("audit-"),
          reportId: publicReport.reportId,
          action: "report_created",
          actor: SYSTEM_ACTOR,
          occurredAt: publicReport.submittedAt,
          after: publicReport.emergencyReported
            ? "시민 확인 후 자동 접수"
            : "시민 제보 접수",
        },
      ],
    });
  }
}

function findReport(reportId: string): OperatorReport {
  const report = loadState().reports.find((r) => r.reportId === reportId);
  if (!report) {
    throw new OperatorReportNotFoundError(
      "사건을 찾지 못했습니다. 목록을 새로고침한 뒤 다시 시도해 주세요.",
    );
  }
  return report;
}

/**
 * 원자적 커밋: 변경과 감사 로그 기록을 하나의 동기 블록에서 수행한 뒤
 * 저장·알림한다. mutator가 예외를 던지면 아무것도 반영되지 않는다.
 */
function commit(mutator: () => void): void {
  loadState();
  mutator();
  persist();
  notify();
}

function makeAudit(
  reportId: string,
  action: AuditLogEntry["action"],
  actor: AuditActor,
  fields: Partial<Pick<AuditLogEntry, "before" | "after" | "reason">> = {},
): AuditLogEntry {
  return {
    id: generateId("audit-"),
    reportId,
    action,
    actor,
    occurredAt: new Date().toISOString(),
    ...fields,
  };
}

/* ------------------------------------------------------------------ */
/* 시민 화면(S7) 동기화                                                 */
/* ------------------------------------------------------------------ */

function toCitizenTriage(report: OperatorReport): TriageAssessment {
  const map: Record<OperatorTriage, TriageType> = {
    emergency: "emergency",
    dispatch: "dispatch",
    negative: "negative",
    analyzing: "unavailable",
    unavailable: "unavailable",
  };
  return {
    type: map[report.triage.currentType],
    summary: report.triage.summary,
    analyzedAt: report.triage.analyzedAt,
    isHumanReviewed: report.status !== "submitted" || !!report.triage.overriddenAt,
  };
}

function syncToCitizenPage(report: OperatorReport): void {
  const stamps: Record<string, string> = {};
  for (const event of report.timeline) {
    switch (event.status) {
      case "submitted":
        stamps.submitted = event.occurredAt;
        break;
      case "reviewing":
        stamps.reviewing = event.occurredAt;
        break;
      case "transferred":
        stamps.transferred = event.occurredAt;
        break;
      case "dispatched":
      case "protected":
        stamps.dispatched = event.occurredAt;
        break;
      case "returned":
      case "closed":
      case "negative_closed":
        stamps.closed = event.occurredAt;
        break;
    }
  }
  if (report.triage.analyzedAt) stamps.triaged = report.triage.analyzedAt;
  else if (
    report.triage.currentType !== "analyzing" &&
    report.triage.currentType !== "unavailable"
  ) {
    stamps.triaged = report.submittedAt;
  }

  syncPublicReport({
    reportId: report.reportId,
    submittedAt: report.submittedAt,
    updatedAt: report.updatedAt,
    triage: toCitizenTriage(report),
    processingStatus: report.status,
    /* 시민 공개 화면에는 정확 좌표 대신 위치 범위 라벨만 전달한다. */
    publicLocationLabel: toPublicLocationLabel(report.location.address),
    emergencyReported: report.isEmergencyAutoSubmitted,
    stamps,
  });
}

/* ------------------------------------------------------------------ */
/* 서비스 API                                                           */
/* ------------------------------------------------------------------ */

export interface TransitionResult {
  report: OperatorReport;
  /** 담당자 미배정 사건을 변경해 본인에게 자동 배정된 경우 */
  autoAssigned: boolean;
}

export interface OperatorReportService {
  listReports(): Promise<OperatorReport[]>;
  getReport(reportId: string): Promise<OperatorReport>;
  /** 수동 새로고침: 시민 신규 접수 인제스트 포함 */
  refresh(): Promise<void>;
  transition(input: {
    reportId: string;
    target: OperatorStatus;
    actor: OperatorSummary;
    closure?: Omit<ClosureRecord, "closedAt" | "closedBy">;
    reason?: string;
  }): Promise<TransitionResult>;
  assignToMe(reportId: string, actor: OperatorSummary): Promise<OperatorReport>;
  overrideTriage(input: {
    reportId: string;
    newType: OperatorTriage;
    reason: TriageOverrideReason;
    note?: string;
    actor: OperatorSummary;
  }): Promise<OperatorReport>;
  decideMatch(input: {
    reportId: string;
    candidateId: string;
    decision: MatchDecision;
    actor: OperatorSummary;
  }): Promise<OperatorReport>;
  /** 실종 신고 연결 후 보호자 알림 확인 (실제 발송 아님 — mock) */
  confirmGuardianNotice(input: {
    reportId: string;
    candidateId: string;
    actor: OperatorSummary;
  }): Promise<{ delivered: boolean; mock: boolean }>;
  recordExport(actor: OperatorSummary, description: string): void;
  subscribe(callback: () => void): () => void;
  subscribeEvents(callback: (event: OperatorRealtimeEvent) => void): () => void;
  getSnapshot(): OperatorReport[];
  /** mock 실시간 유입 시작 (세션당 1회 주입) */
  startRealtimeMock(): () => void;
}

const OVERRIDE_REASON_LABELS: Record<TriageOverrideReason, string> = {
  false_positive: "오탐",
  condition_changed: "상태 변화",
  insufficient_information: "정보 부족",
  other: "기타",
};

export const TRIAGE_OVERRIDE_REASON_LABELS = OVERRIDE_REASON_LABELS;

const mockOperatorReportService: OperatorReportService = {
  async listReports() {
    loadState();
    await delay(300);
    return cachedList;
  },

  async getReport(reportId) {
    await delay(200);
    return findReport(reportId);
  },

  async refresh() {
    await delay(350);
    commit(() => {
      ingestCitizenReports();
    });
  },

  async transition({ reportId, target, actor, closure, reason }) {
    await delay(350);
    let autoAssigned = false;
    let updated: OperatorReport | null = null;

    commit(() => {
      const report = findReport(reportId);
      if (report.mergedIntoReportId) {
        throw new TransitionNotAllowedError(
          `이 사건은 ${report.mergedIntoReportId}로 병합되어 상태를 변경할 수 없습니다.`,
        );
      }
      /* UI 버튼 노출과 별개로 데이터 계층에서도 전환을 검증한다. */
      if (!canTransition(report.status, target)) {
        throw new TransitionNotAllowedError(
          `'${OPERATOR_STATUS_LABELS[report.status]}' 상태에서 '${OPERATOR_STATUS_LABELS[target]}'(으)로 변경할 수 없습니다. 사건이 다른 담당자에 의해 갱신되었는지 확인해 주세요.`,
        );
      }
      if (target === "closed" && !closure) {
        throw new ValidationError("종결 결과 분류를 선택해 주세요.");
      }

      const now = new Date().toISOString();

      if (!report.assignee) {
        report.assignee = actor;
        autoAssigned = true;
        report.auditLog.push(
          makeAudit(reportId, "assigned", actor, {
            after: `${actor.displayName} 배정`,
            reason: "담당자 미배정 사건 상태 변경 시 자동 배정",
          }),
        );
      }

      const before = report.status;
      report.status = target;
      report.updatedAt = now;
      report.timeline.push({
        id: generateId("ev-"),
        status: target,
        occurredAt: now,
        actor,
      });

      if (target === "closed" && closure) {
        report.closure = { ...closure, closedAt: now, closedBy: actor };
      }
      if (target === "negative_closed") {
        report.closure = {
          outcome: "negative_or_mistake",
          note: reason,
          closedAt: now,
          closedBy: actor,
        };
      }

      report.auditLog.push(
        makeAudit(
          reportId,
          target === "closed" || target === "negative_closed" ? "closed" : "status_changed",
          actor,
          {
            before: OPERATOR_STATUS_LABELS[before],
            after: OPERATOR_STATUS_LABELS[target],
            reason,
          },
        ),
      );

      /* 상태 변경과 같은 커밋 안에서 시민 공개 데이터를 갱신한다. */
      syncToCitizenPage(report);
      updated = report;
    });

    emit({ type: "report.status_changed", reportId });
    return { report: updated as unknown as OperatorReport, autoAssigned };
  },

  async assignToMe(reportId, actor) {
    await delay(250);
    let updated: OperatorReport | null = null;
    commit(() => {
      const report = findReport(reportId);
      if (report.assignee?.id === actor.id) {
        updated = report;
        return;
      }
      const before = report.assignee?.displayName;
      report.assignee = actor;
      report.updatedAt = new Date().toISOString();
      report.auditLog.push(
        makeAudit(reportId, "assigned", actor, {
          before: before ?? "미배정",
          after: `${actor.displayName} 배정`,
        }),
      );
      updated = report;
    });
    emit({ type: "report.assigned", reportId });
    return updated as unknown as OperatorReport;
  },

  async overrideTriage({ reportId, newType, reason, note, actor }) {
    await delay(350);
    if (!reason) {
      throw new ValidationError("번복 사유를 선택해 주세요.");
    }
    if (reason === "other" && !note?.trim()) {
      throw new ValidationError("기타 사유를 선택한 경우 간단한 설명을 입력해 주세요.");
    }
    let updated: OperatorReport | null = null;
    commit(() => {
      const report = findReport(reportId);
      const beforeType = report.triage.currentType;
      if (beforeType === newType) {
        throw new ValidationError("현재 판정과 같은 값으로는 번복할 수 없습니다.");
      }
      const now = new Date().toISOString();
      /* 원 판정(originalType)은 덮어쓰지 않고 보존한다. */
      report.triage = {
        ...report.triage,
        currentType: newType,
        overriddenAt: now,
        overriddenBy: actor,
        overrideReason: reason,
        overrideNote: note?.trim() || undefined,
      };
      report.updatedAt = now;
      report.auditLog.push(
        makeAudit(reportId, "triage_overridden", actor, {
          before: TRIAGE_LABELS[beforeType],
          after: TRIAGE_LABELS[newType],
          reason: `${OVERRIDE_REASON_LABELS[reason]}${note ? ` — ${note}` : ""}`,
        }),
      );
      syncToCitizenPage(report);
      updated = report;
    });
    emit({ type: "report.updated", reportId });
    return updated as unknown as OperatorReport;
  },

  async decideMatch({ reportId, candidateId, decision, actor }) {
    await delay(350);
    let updated: OperatorReport | null = null;
    commit(() => {
      const report = findReport(reportId);
      const candidate = report.matchCandidates.find(
        (c) => c.candidateId === candidateId,
      );
      if (!candidate) {
        throw new OperatorReportNotFoundError("매칭 후보를 찾지 못했습니다.");
      }
      if (candidate.decision === "merge") {
        throw new ValidationError("이미 병합 확정된 후보입니다.");
      }
      const now = new Date().toISOString();
      candidate.decision = decision;
      candidate.decidedAt = now;
      candidate.decidedBy = actor;
      report.updatedAt = now;

      if (decision === "link") {
        if (!report.linkedReportIds.includes(candidateId)) {
          report.linkedReportIds.push(candidateId);
        }
        const other = state?.reports.find((r) => r.reportId === candidateId);
        if (other && !other.linkedReportIds.includes(reportId)) {
          other.linkedReportIds.push(reportId);
          other.auditLog.push(
            makeAudit(candidateId, "report_linked", actor, {
              after: `${reportId}와 같은 개체로 연결`,
            }),
          );
        }
        report.auditLog.push(
          makeAudit(reportId, "report_linked", actor, {
            after: `${candidate.title}와 같은 개체로 연결`,
          }),
        );
      } else if (decision === "merge") {
        if (candidate.candidateType !== "report") {
          throw new ValidationError("실종 신고는 병합 대상이 아닙니다. 연결만 가능합니다.");
        }
        if (!report.mergedReportIds.includes(candidateId)) {
          report.mergedReportIds.push(candidateId);
        }
        const other = state?.reports.find((r) => r.reportId === candidateId);
        if (other) {
          /* 병합된 원 사건은 삭제하지 않고 관계만 기록한다. */
          other.mergedIntoReportId = reportId;
          other.updatedAt = now;
          other.auditLog.push(
            makeAudit(candidateId, "report_merged", actor, {
              before: `${candidateId} 개별 사건`,
              after: `${reportId}로 병합 (원 기록 보존)`,
            }),
          );
        }
        report.auditLog.push(
          makeAudit(reportId, "report_merged", actor, {
            before: `${candidateId} 개별 사건`,
            after: `${candidateId} → ${reportId} 병합 (원 기록 보존)`,
            reason: "중복 제보 병합",
          }),
        );
      } else {
        report.auditLog.push(
          makeAudit(reportId, "match_rejected", actor, {
            after: `${candidate.title} 무관 처리`,
          }),
        );
      }
      updated = report;
    });
    emit(
      decision === "merge"
        ? { type: "report.merged", reportId }
        : { type: "report.updated", reportId },
    );
    return updated as unknown as OperatorReport;
  },

  async confirmGuardianNotice({ reportId, candidateId, actor }) {
    await delay(400);
    commit(() => {
      const report = findReport(reportId);
      const candidate = report.matchCandidates.find(
        (c) => c.candidateId === candidateId,
      );
      if (!candidate) {
        throw new OperatorReportNotFoundError("매칭 후보를 찾지 못했습니다.");
      }
      if (candidate.decision !== "link") {
        throw new ValidationError("보호자 알림 확인 전에 먼저 같은 개체로 연결해 주세요.");
      }
      const now = new Date().toISOString();
      candidate.guardianNoticeConfirmedAt = now;
      report.updatedAt = now;
      report.auditLog.push(
        makeAudit(reportId, "guardian_notice_confirmed", actor, {
          after: `${candidate.title} 보호자 알림 발송 확인 (mock — 실제 발송 미연동)`,
        }),
      );
    });
    /* notification adapter: 실제 문자·푸시 발송 API 미연동 상태 */
    return { delivered: true, mock: true };
  },

  recordExport(actor, description) {
    commit(() => {
      if (!state) return;
      state.exportLog.push(
        makeAudit("-", "exported", actor, { after: description }),
      );
    });
  },

  subscribe(callback) {
    storeSubscribers.add(callback);
    return () => storeSubscribers.delete(callback);
  },

  subscribeEvents(callback) {
    eventSubscribers.add(callback);
    return () => eventSubscribers.delete(callback);
  },

  getSnapshot() {
    loadState();
    return cachedList;
  },

  startRealtimeMock() {
    const timers: number[] = [];
    if (!sessionStorage.getItem(REALTIME_FLAG_KEY)) {
      sessionStorage.setItem(REALTIME_FLAG_KEY, "1");
      timers.push(
        window.setTimeout(() => injectIncomingReport("dispatch"), 20_000),
        window.setTimeout(() => injectIncomingReport("emergency"), 45_000),
      );
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  },
};

/** mock 실시간 유입: 새 제보 1건을 생성해 이벤트를 발행한다. */
function injectIncomingReport(triage: "dispatch" | "emergency"): void {
  const num = Math.floor(1000 + Math.random() * 9000);
  const reportId = `JJ-${num}`;
  const now = new Date().toISOString();
  const tone = PHOTO_TONES[triage === "emergency" ? 0 : 2];
  const photoUri = mockDogPhotoUri({ ...tone, label: `${reportId} · 사진 1` });

  const emergencyMeta = {
    address: "제주특별자치도 제주시 도남동 도남초등학교 후문",
    latitude: 33.4923,
    longitude: 126.5305,
    summary: "차도 한가운데 멈춰 서 있어 즉시 대응이 필요해 보입니다.",
    description: "학교 후문 앞 도로에서 차들이 피해가고 있어요.",
    tags: ["도로 주변", "움직임 없음"],
    confidence: 0.9,
  };
  const dispatchMeta = {
    address: "제주특별자치도 제주시 오라이동 오라동 산책로",
    latitude: 33.4832,
    longitude: 126.5121,
    summary: "목줄 없이 산책로를 배회하고 있어 확인이 필요합니다.",
    description: "산책로에서 계속 따라와요. 배가 고파 보입니다.",
    tags: ["배회", "목줄 없음"],
    confidence: 0.74,
  };
  const meta = triage === "emergency" ? emergencyMeta : dispatchMeta;

  commit(() => {
    if (!state) return;
    if (state.reports.some((r) => r.reportId === reportId)) return;
    state.reports.push({
      reportId,
      submittedAt: now,
      updatedAt: now,
      photos: [
        {
          id: `${reportId}-photo-1`,
          thumbnailUrl: photoUri,
          originalUrl: photoUri,
          alt: `제보 사진 1: ${meta.address} 인근에서 발견된 개로 제보된 모습 (mock 이미지)`,
        },
      ],
      location: {
        latitude: meta.latitude,
        longitude: meta.longitude,
        address: meta.address,
      },
      reporterContext: {
        observedAt: now,
        description: meta.description,
        situationTags: meta.tags,
      },
      triage: {
        originalType: triage,
        currentType: triage,
        summary: meta.summary,
        confidence: meta.confidence,
        analyzedAt: now,
      },
      status: "submitted",
      timeline: [
        {
          id: `${reportId}-ev-submitted`,
          status: "submitted",
          occurredAt: now,
          actor: SYSTEM_ACTOR,
        },
      ],
      isEmergencyAutoSubmitted: triage === "emergency",
      matchCandidates: [],
      linkedReportIds: [],
      mergedReportIds: [],
      auditLog: [
        {
          id: generateId("audit-"),
          reportId,
          action: "report_created",
          actor: SYSTEM_ACTOR,
          occurredAt: now,
          after:
            triage === "emergency" ? "시민 확인 후 자동 접수" : "시민 제보 접수",
        },
      ],
    });
  });

  emit(
    triage === "emergency"
      ? { type: "report.emergency", reportId }
      : { type: "report.created", reportId },
  );
}

export const operatorReportService: OperatorReportService =
  mockOperatorReportService;

export const CLOSURE_OUTCOME_LABELS: Record<
  NonNullable<OperatorReport["closure"]>["outcome"],
  string
> = {
  shelter_transfer: "보호소 인계",
  guardian_return: "보호자 반환",
  natural_return: "자연 복귀",
  negative_or_mistake: "부정 또는 오인",
  other: "기타",
};
