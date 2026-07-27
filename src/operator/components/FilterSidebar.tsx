import { forwardRef } from "react";
import type { OperatorStatus, OperatorSummary, OperatorTriage, QueueFilters } from "../types";
import {
  ALL_OPERATOR_STATUSES,
  OPERATOR_STATUS_LABELS,
  TRIAGE_LABELS,
} from "../domain/report-machine";
import { REGION_OPTIONS } from "../domain/queue";
import "./FilterSidebar.css";

export interface FilterSidebarProps {
  filters: QueueFilters;
  onChange: (next: QueueFilters) => void;
  onReset: () => void;
  operators: OperatorSummary[];
  resultCount: number;
}

const TRIAGE_OPTIONS: OperatorTriage[] = [
  "emergency",
  "dispatch",
  "negative",
  "analyzing",
  "unavailable",
];

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/**
 * 필터 사이드바 (Desktop 240px / 좁은 화면 드로어).
 * 큐와 지도 뷰가 같은 필터 상태를 공유한다.
 */
export const FilterSidebar = forwardRef<HTMLInputElement, FilterSidebarProps>(
  function FilterSidebar({ filters, onChange, onReset, operators, resultCount }, searchRef) {
    return (
      <div className="filter-sidebar">
        <div className="filter-sidebar__section">
          <label className="filter-sidebar__label" htmlFor="queue-search">
            검색
          </label>
          <input
            id="queue-search"
            ref={searchRef}
            type="search"
            className="filter-sidebar__search"
            placeholder="사건번호·위치·특징 (/)"
            value={filters.query}
            onChange={(e) => onChange({ ...filters, query: e.target.value })}
          />
        </div>

        <fieldset className="filter-sidebar__section">
          <legend className="filter-sidebar__label">트리아지</legend>
          {TRIAGE_OPTIONS.map((triage) => (
            <label key={triage} className="filter-sidebar__check">
              <input
                type="checkbox"
                checked={filters.triage.includes(triage)}
                onChange={() =>
                  onChange({ ...filters, triage: toggle(filters.triage, triage) })
                }
              />
              {TRIAGE_LABELS[triage]}
            </label>
          ))}
        </fieldset>

        <fieldset className="filter-sidebar__section">
          <legend className="filter-sidebar__label">처리 상태</legend>
          {ALL_OPERATOR_STATUSES.map((status: OperatorStatus) => (
            <label key={status} className="filter-sidebar__check">
              <input
                type="checkbox"
                checked={filters.statuses.includes(status)}
                onChange={() =>
                  onChange({ ...filters, statuses: toggle(filters.statuses, status) })
                }
              />
              {OPERATOR_STATUS_LABELS[status]}
            </label>
          ))}
          <label className="filter-sidebar__check filter-sidebar__check--muted">
            <input
              type="checkbox"
              checked={filters.includeClosed}
              onChange={() =>
                onChange({ ...filters, includeClosed: !filters.includeClosed })
              }
            />
            종결·부정 종결 포함
          </label>
        </fieldset>

        <fieldset className="filter-sidebar__section">
          <legend className="filter-sidebar__label">기간</legend>
          <div className="filter-sidebar__dates">
            <label className="visually-hidden" htmlFor="filter-date-from">
              시작일
            </label>
            <input
              id="filter-date-from"
              type="date"
              value={filters.dateFrom ?? ""}
              onChange={(e) =>
                onChange({ ...filters, dateFrom: e.target.value || undefined })
              }
            />
            <span aria-hidden="true">~</span>
            <label className="visually-hidden" htmlFor="filter-date-to">
              종료일
            </label>
            <input
              id="filter-date-to"
              type="date"
              value={filters.dateTo ?? ""}
              onChange={(e) =>
                onChange({ ...filters, dateTo: e.target.value || undefined })
              }
            />
          </div>
        </fieldset>

        <fieldset className="filter-sidebar__section">
          <legend className="filter-sidebar__label">지역</legend>
          {REGION_OPTIONS.map((region) => (
            <label key={region} className="filter-sidebar__check">
              <input
                type="checkbox"
                checked={filters.regions.includes(region)}
                onChange={() =>
                  onChange({ ...filters, regions: toggle(filters.regions, region) })
                }
              />
              {region}
            </label>
          ))}
        </fieldset>

        <fieldset className="filter-sidebar__section">
          <legend className="filter-sidebar__label">담당자</legend>
          <label className="filter-sidebar__check">
            <input
              type="checkbox"
              checked={filters.assignedToMe}
              onChange={() =>
                onChange({ ...filters, assignedToMe: !filters.assignedToMe })
              }
            />
            나에게 배정된 건
          </label>
          {operators.map((operator) => (
            <label key={operator.id} className="filter-sidebar__check">
              <input
                type="checkbox"
                checked={filters.assigneeIds.includes(operator.id)}
                onChange={() =>
                  onChange({
                    ...filters,
                    assigneeIds: toggle(filters.assigneeIds, operator.id),
                  })
                }
              />
              {operator.displayName}
            </label>
          ))}
        </fieldset>

        <div className="filter-sidebar__footer">
          <span className="filter-sidebar__count tabular-nums" aria-live="polite">
            {resultCount}건 표시 중
          </span>
          <button type="button" className="filter-sidebar__reset" onClick={onReset}>
            전체 초기화
          </button>
        </div>
      </div>
    );
  },
);
