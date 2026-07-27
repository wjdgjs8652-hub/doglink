import { useMemo, useState } from "react";
import type { Ref } from "react";
import { Button } from "../../components/Button";
import { InlineNotice } from "../../components/InlineNotice";
import { ProcessTimeline } from "../../components/ProcessTimeline";
import { StatusBadge } from "../../components/StatusBadge";
import { TriageBadge } from "../../components/TriageBadge";
import type { ProcessStep } from "../../types/report";
import {
  formatAbsolute,
  formatAbsoluteSeconds,
  formatDurationMinutes,
  minutesBetween,
} from "../../lib/date-time";
import {
  OPERATOR_STATUS_BADGE,
  OPERATOR_STATUS_LABELS,
} from "../domain/report-machine";
import { CLOSURE_OUTCOME_LABELS } from "../services/operator-report-service";
import type {
  MatchDecision,
  OperatorReport,
  OperatorSummary,
  OperatorTriage,
  TriageOverrideReason,
} from "../types";
import { ActionBar } from "./ActionBar";
import type { ActionBarHandle, ActionBarSubmitInput } from "./ActionBar";
import { AITriageCard } from "./AITriageCard";
import { AuditLogList } from "./AuditLogList";
import { MatchCandidateSection } from "./MatchCandidateSection";
import { PhotoViewer } from "./PhotoViewer";
import "./DetailPanel.css";

export interface DetailPanelProps {
  report: OperatorReport;
  currentOperator: OperatorSummary;
  busy: boolean;
  actionBarRef?: Ref<ActionBarHandle>;
  onClose: () => void;
  onTransition: (input: ActionBarSubmitInput) => Promise<void>;
  onAssignToMe: () => Promise<void>;
  onOverrideTriage: (input: {
    newType: OperatorTriage;
    reason: TriageOverrideReason;
    note?: string;
  }) => Promise<void>;
  onDecideMatch: (candidateId: string, decision: MatchDecision) => Promise<void>;
  onConfirmGuardianNotice: (candidateId: string) => Promise<void>;
  onOpenMap: () => void;
  onOpenReport: (reportId: string) => void;
}

function buildTimelineSteps(report: OperatorReport): ProcessStep[] {
  const stamp = (statuses: string[]): string | undefined =>
    report.timeline.find((e) => statuses.includes(e.status))?.occurredAt;

  const transferEvent = report.timeline.find((e) =>
    ["transferred", "dispatched"].includes(e.status),
  );
  const resolveEvent = report.timeline.find((e) =>
    ["protected", "returned"].includes(e.status),
  );

  const statusIdx: Record<OperatorReport["status"], number> = {
    submitted: report.triage.analyzedAt ? 1 : 0,
    reviewing: 2,
    transferred: 3,
    dispatched: 3,
    protected: 4,
    returned: 4,
    negative_closed: 5,
    closed: 5,
  };
  const currentIdx = statusIdx[report.status];

  const defs: Array<{ id: string; label: string; timestamp?: string }> = [
    { id: "submitted", label: "제보됨", timestamp: report.submittedAt },
    { id: "triaged", label: "AI 판정", timestamp: report.triage.analyzedAt },
    { id: "reviewing", label: "확인 중", timestamp: stamp(["reviewing"]) },
    {
      id: "transfer",
      label:
        transferEvent?.status === "dispatched" ? "출동" : "기관 전달 또는 출동",
      timestamp: transferEvent?.occurredAt,
    },
    {
      id: "resolve",
      label: resolveEvent?.status === "returned" ? "반환" : "보호 또는 반환",
      timestamp: resolveEvent?.occurredAt,
    },
    {
      id: "closed",
      label: report.status === "negative_closed" ? "부정 종결" : "종결",
      timestamp: stamp(["closed", "negative_closed"]),
    },
  ];

  return defs.map((def, i) => ({
    id: def.id,
    label: def.label,
    status: i < currentIdx ? "completed" : i === currentIdx ? "current" : "upcoming",
    timestamp: def.timestamp,
  }));
}

/** 건 상세 패널 (O3). Desktop 우측 400px / 좁은 화면 전체 전환. */
export function DetailPanel({
  report,
  currentOperator,
  busy,
  actionBarRef,
  onClose,
  onTransition,
  onAssignToMe,
  onOverrideTriage,
  onDecideMatch,
  onConfirmGuardianNotice,
  onOpenMap,
  onOpenReport,
}: DetailPanelProps) {
  const [copied, setCopied] = useState(false);
  const steps = useMemo(() => buildTimelineSteps(report), [report]);

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(report.reportId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard 미지원 환경 무시 */
    }
  };

  const closureSummary = report.closure;
  const firstResponse = (() => {
    const reviewing = report.timeline.find((e) => e.status === "reviewing");
    return reviewing ? minutesBetween(report.submittedAt, reviewing.occurredAt) : null;
  })();
  const totalDuration = closureSummary
    ? minutesBetween(report.submittedAt, closureSummary.closedAt)
    : null;

  return (
    <div className="detail-panel" aria-label={`사건 ${report.reportId} 상세`}>
      <div className="detail-panel__scroll">
        {/* 1. 사건 헤더 */}
        <header className="detail-panel__header">
          <div className="detail-panel__id-row">
            <h2 className="detail-panel__id tabular-nums">{report.reportId}</h2>
            <button
              type="button"
              className="detail-panel__copy"
              aria-label="사건번호 복사"
              onClick={copyId}
            >
              {copied ? (
                "복사됨"
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <rect x="4.5" y="4.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M9.5 4.5v-2a1 1 0 00-1-1h-6a1 1 0 00-1 1v6a1 1 0 001 1h2" stroke="currentColor" strokeWidth="1.3" />
                </svg>
              )}
            </button>
            <button
              type="button"
              className="detail-panel__close"
              aria-label="상세 패널 닫기"
              onClick={onClose}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="detail-panel__badges">
            <TriageBadge variant={report.triage.currentType} />
            <StatusBadge
              variant={OPERATOR_STATUS_BADGE[report.status]}
              label={OPERATOR_STATUS_LABELS[report.status]}
            />
          </div>
          <dl className="detail-panel__meta">
            <div>
              <dt>담당자</dt>
              <dd>
                {report.assignee ? (
                  report.assignee.displayName
                ) : (
                  <span className="detail-panel__unassigned">미배정</span>
                )}
                {report.assignee?.id !== currentOperator.id && (
                  <button
                    type="button"
                    className="detail-panel__assign"
                    disabled={busy}
                    onClick={() => void onAssignToMe()}
                  >
                    나에게 배정 (A)
                  </button>
                )}
              </dd>
            </div>
            <div>
              <dt>접수</dt>
              <dd className="tabular-nums">
                {formatAbsoluteSeconds(report.submittedAt)}
              </dd>
            </div>
            <div>
              <dt>마지막 갱신</dt>
              <dd className="tabular-nums">{formatAbsolute(report.updatedAt)}</dd>
            </div>
          </dl>
          {report.isEmergencyAutoSubmitted && (
            <InlineNotice variant="warning">
              시민 확인 후 자동 접수된 응급 건입니다.
            </InlineNotice>
          )}
          {report.mergedIntoReportId && (
            <InlineNotice variant="info">
              이 사건은{" "}
              <button
                type="button"
                className="detail-panel__link"
                onClick={() => onOpenReport(report.mergedIntoReportId!)}
              >
                {report.mergedIntoReportId}
              </button>
              (으)로 병합되었습니다. 원 기록은 감사 추적을 위해 보존됩니다.
            </InlineNotice>
          )}
        </header>

        {/* 2. 사진 원본 뷰어 */}
        <section className="detail-panel__section" aria-label="제보 사진">
          <PhotoViewer photos={report.photos} />
        </section>

        {/* 3. AI 판정 카드 */}
        <section className="detail-panel__section">
          <AITriageCard
            triage={report.triage}
            isHumanConfirmed={report.status !== "submitted"}
            onOverride={onOverrideTriage}
          />
        </section>

        {/* 4. 제보 정보 */}
        <section className="detail-panel__section" aria-label="제보 정보">
          <h3 className="detail-panel__section-title">제보 정보</h3>
          <dl className="detail-panel__facts">
            <div>
              <dt>정확 좌표</dt>
              <dd className="tabular-nums">
                {report.location.latitude.toFixed(5)},{" "}
                {report.location.longitude.toFixed(5)}
                <button
                  type="button"
                  className="detail-panel__link detail-panel__map-link"
                  onClick={onOpenMap}
                >
                  지도에서 보기
                </button>
              </dd>
            </div>
            <div>
              <dt>주소</dt>
              <dd>{report.location.address}</dd>
            </div>
            <div>
              <dt>목격 시각</dt>
              <dd className="tabular-nums">
                {report.reporterContext.observedAt
                  ? formatAbsolute(report.reporterContext.observedAt)
                  : "제공되지 않음"}
              </dd>
            </div>
            <div>
              <dt>접수 시각</dt>
              <dd className="tabular-nums">{formatAbsolute(report.submittedAt)}</dd>
            </div>
            <div>
              <dt>시민 서술</dt>
              <dd>
                {report.reporterContext.description ?? (
                  <span className="detail-panel__empty-value">서술 없음</span>
                )}
              </dd>
            </div>
            <div>
              <dt>상황</dt>
              <dd>
                {report.reporterContext.situationTags.length > 0 ? (
                  <span className="detail-panel__chips">
                    {report.reporterContext.situationTags.map((tag) => (
                      <span key={tag} className="detail-panel__chip">
                        {tag}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="detail-panel__empty-value">선택된 상황 없음</span>
                )}
              </dd>
            </div>
            <div>
              <dt>사진</dt>
              <dd className="tabular-nums">{report.photos.length}장</dd>
            </div>
            <div>
              <dt>응급 자동신고</dt>
              <dd>{report.isEmergencyAutoSubmitted ? "예 (시민 확인 후 자동 접수)" : "아니요"}</dd>
            </div>
          </dl>
          <p className="detail-panel__privacy-note">
            정확 좌표는 처리 목적의 운영자 화면에만 표시되며, 시민 상태 확인
            페이지에는 위치 범위만 노출됩니다.
          </p>
        </section>

        {/* 5. 처리 타임라인 (시민 서비스와 같은 공용 컴포넌트) */}
        <section className="detail-panel__section" aria-label="처리 타임라인">
          <h3 className="detail-panel__section-title">처리 타임라인</h3>
          <ProcessTimeline
            steps={steps}
            showTimestamps
            preciseTime={report.triage.currentType === "emergency"}
          />
        </section>

        {/* 6. 종결 요약 */}
        {closureSummary && (
          <section className="detail-panel__section" aria-label="종결 요약">
            <h3 className="detail-panel__section-title">종결 요약</h3>
            <dl className="detail-panel__facts">
              <div>
                <dt>최종 결과</dt>
                <dd>{CLOSURE_OUTCOME_LABELS[closureSummary.outcome]}</dd>
              </div>
              {closureSummary.note && (
                <div>
                  <dt>메모</dt>
                  <dd>{closureSummary.note}</dd>
                </div>
              )}
              <div>
                <dt>총 소요 시간</dt>
                <dd className="tabular-nums">
                  {totalDuration !== null
                    ? formatDurationMinutes(totalDuration)
                    : "-"}
                </dd>
              </div>
              <div>
                <dt>초동 대응 시간</dt>
                <dd className="tabular-nums">
                  {firstResponse !== null
                    ? formatDurationMinutes(firstResponse)
                    : "확인 시작 기록 없음"}
                </dd>
              </div>
              <div>
                <dt>종결 담당자</dt>
                <dd>
                  {closureSummary.closedBy.displayName} ·{" "}
                  <span className="tabular-nums">
                    {formatAbsolute(closureSummary.closedAt)}
                  </span>
                </dd>
              </div>
              {(report.linkedReportIds.length > 0 ||
                report.mergedReportIds.length > 0) && (
                <div>
                  <dt>연결·병합</dt>
                  <dd>
                    {[
                      ...report.linkedReportIds.map((id) => `연결 ${id}`),
                      ...report.mergedReportIds.map((id) => `병합 ${id}`),
                    ].join(", ")}
                  </dd>
                </div>
              )}
            </dl>
          </section>
        )}

        {/* 연결·병합 관계 (종결 전에도 표시) */}
        {!closureSummary &&
          (report.linkedReportIds.length > 0 || report.mergedReportIds.length > 0) && (
            <section className="detail-panel__section" aria-label="연결된 사건">
              <h3 className="detail-panel__section-title">연결·병합 관계</h3>
              <ul className="detail-panel__relations">
                {report.linkedReportIds.map((id) => (
                  <li key={`link-${id}`}>
                    같은 개체 연결:{" "}
                    <button
                      type="button"
                      className="detail-panel__link"
                      onClick={() => onOpenReport(id)}
                    >
                      {id}
                    </button>
                  </li>
                ))}
                {report.mergedReportIds.map((id) => (
                  <li key={`merge-${id}`}>
                    병합된 제보:{" "}
                    <button
                      type="button"
                      className="detail-panel__link"
                      onClick={() => onOpenReport(id)}
                    >
                      {id}
                    </button>{" "}
                    (원 기록 보존)
                  </li>
                ))}
              </ul>
            </section>
          )}

        {/* 7. 중복·실종 매칭 (O4-M) */}
        <section className="detail-panel__section">
          <MatchCandidateSection
            report={report}
            busy={busy}
            onDecide={onDecideMatch}
            onConfirmGuardianNotice={onConfirmGuardianNotice}
          />
        </section>

        {/* 8. 감사 로그 */}
        <section className="detail-panel__section">
          <AuditLogList entries={report.auditLog} />
        </section>
      </div>

      {/* 하단 고정 ActionBar */}
      {!report.mergedIntoReportId && (
        <ActionBar
          ref={actionBarRef}
          report={report}
          busy={busy}
          onSubmit={onTransition}
        />
      )}
    </div>
  );
}
