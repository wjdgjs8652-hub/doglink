import { useEffect, useRef } from "react";
import type { OperatorReport } from "../types";
import { AgencyQueueRow } from "./AgencyQueueRow";
import "./QueueList.css";

export interface QueueListProps {
  reports: OperatorReport[];
  selectedId: string | null;
  activeId: string | null;
  newReportIds: ReadonlySet<string>;
  onSelect: (reportId: string) => void;
}

/**
 * 제보 큐 리스트 (listbox + aria-activedescendant).
 * 자동 갱신 시 포커스·스크롤 위치를 강탈하지 않는다.
 */
export function QueueList({
  reports,
  selectedId,
  activeId,
  newReportIds,
  onSelect,
}: QueueListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  /* 키보드 커서 이동 시에만 해당 행이 보이도록 최소 스크롤 */
  useEffect(() => {
    if (!activeId || !listRef.current) return;
    const row = listRef.current.querySelector<HTMLElement>(
      `#queue-row-${CSS.escape(activeId)}`,
    );
    row?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  return (
    <div
      ref={listRef}
      role="listbox"
      aria-label="제보 큐"
      tabIndex={0}
      aria-activedescendant={activeId ? `queue-row-${activeId}` : undefined}
      className="queue-list"
    >
      <div className="queue-list__header" aria-hidden="true">
        <span>트리아지</span>
        <span>접수</span>
        <span>사건번호</span>
        <span />
        <span>AI 특징 요약</span>
        <span>발견 위치</span>
        <span>상태</span>
        <span>담당</span>
      </div>
      {reports.map((report) => (
        <AgencyQueueRow
          key={report.reportId}
          report={report}
          isSelected={report.reportId === selectedId}
          isActive={report.reportId === activeId}
          isNew={newReportIds.has(report.reportId)}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
