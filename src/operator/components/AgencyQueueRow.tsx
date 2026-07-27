import { StatusBadge } from "../../components/StatusBadge";
import { TriageBadge } from "../../components/TriageBadge";
import {
  formatAbsolute,
  formatRelative,
  formatSpoken,
} from "../../lib/date-time";
import {
  OPERATOR_STATUS_BADGE,
  OPERATOR_STATUS_LABELS,
} from "../domain/report-machine";
import type { OperatorReport } from "../types";
import "./AgencyQueueRow.css";

export interface AgencyQueueRowProps {
  report: OperatorReport;
  isSelected: boolean;
  isActive: boolean;
  isNew: boolean;
  onSelect: (reportId: string) => void;
}

/** 제보 큐 행 (기본 높이 48px). */
export function AgencyQueueRow({
  report,
  isSelected,
  isActive,
  isNew,
  onSelect,
}: AgencyQueueRowProps) {
  const isEmergency = report.triage.currentType === "emergency";
  const classes = [
    "queue-row",
    isEmergency ? "queue-row--emergency" : "",
    isSelected ? "queue-row--selected" : "",
    isActive ? "queue-row--active" : "",
    isNew ? "queue-row--new" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      id={`queue-row-${report.reportId}`}
      role="option"
      aria-selected={isSelected}
      className={classes}
      onClick={() => onSelect(report.reportId)}
    >
      <span className="queue-row__triage">
        <TriageBadge variant={report.triage.currentType} />
      </span>
      <span
        className="queue-row__time tabular-nums"
        title={formatAbsolute(report.submittedAt)}
      >
        {formatRelative(report.submittedAt)}
        <span className="visually-hidden">
          , {formatSpoken(report.submittedAt)}
        </span>
      </span>
      <span className="queue-row__id tabular-nums">{report.reportId}</span>
      {report.photos[0] ? (
        <img
          className="queue-row__thumb"
          src={report.photos[0].thumbnailUrl}
          alt=""
        />
      ) : (
        <span className="queue-row__thumb queue-row__thumb--empty" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <rect x="1.5" y="2.5" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="5.4" cy="6.4" r="1.1" fill="currentColor" />
            <path d="M2.5 12l3.4-3.4 2.4 2.4 3-3 2.2 2.2" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </span>
      )}
      <span className="queue-row__summary" title={report.triage.summary}>
        {report.triage.summary}
      </span>
      <span className="queue-row__address" title={report.location.address}>
        {report.location.address}
      </span>
      <span className="queue-row__status">
        <StatusBadge
          variant={OPERATOR_STATUS_BADGE[report.status]}
          label={OPERATOR_STATUS_LABELS[report.status]}
        />
      </span>
      <span className="queue-row__assignee">
        {report.assignee ? (
          <span title={`담당자 ${report.assignee.displayName}`}>
            {report.assignee.displayName}
          </span>
        ) : (
          <span className="queue-row__assignee--none">미배정</span>
        )}
      </span>
    </div>
  );
}
