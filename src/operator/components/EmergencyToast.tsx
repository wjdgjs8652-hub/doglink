import { formatAbsolute, formatRelative } from "../../lib/date-time";
import type { OperatorReport } from "../types";
import "./EmergencyToast.css";

export interface EmergencyToastProps {
  report: OperatorReport;
  onOpen: (reportId: string) => void;
  onDismiss: (reportId: string) => void;
}

/**
 * 응급 지속 알림 토스트.
 * - 자동 소멸하지 않는다. (수동 닫기만 가능)
 * - 닫아도 응급 카운터와 큐 상단 고정은 유지된다.
 * - 포커스를 강제로 가져오지 않는다.
 */
export function EmergencyToast({ report, onOpen, onDismiss }: EmergencyToastProps) {
  return (
    <div className="emergency-toast" role="alert">
      <div className="emergency-toast__head">
        <span className="emergency-toast__badge">
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M7 1.2L13 12H1L7 1.2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
          응급 제보
        </span>
        <button
          type="button"
          className="emergency-toast__close"
          aria-label={`응급 알림 닫기 (사건 ${report.reportId})`}
          onClick={() => onDismiss(report.reportId)}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="emergency-toast__body">
        {report.photos[0] ? (
          <img
            className="emergency-toast__thumb"
            src={report.photos[0].thumbnailUrl}
            alt=""
          />
        ) : (
          <span className="emergency-toast__thumb emergency-toast__thumb--empty" aria-hidden="true" />
        )}
        <div className="emergency-toast__info">
          <p className="emergency-toast__summary">{report.triage.summary}</p>
          <p className="emergency-toast__meta">
            <span>{report.location.address}</span>
          </p>
          <p className="emergency-toast__meta tabular-nums">
            {formatRelative(report.submittedAt)} ·{" "}
            {formatAbsolute(report.submittedAt)}
          </p>
        </div>
      </div>
      <button
        type="button"
        className="emergency-toast__open"
        onClick={() => onOpen(report.reportId)}
      >
        사건 열기 · {report.reportId}
      </button>
    </div>
  );
}
