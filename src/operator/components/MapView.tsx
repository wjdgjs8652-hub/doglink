import { useMemo, useState } from "react";
import { Button } from "../../components/Button";
import { StatusBadge } from "../../components/StatusBadge";
import { TriageBadge } from "../../components/TriageBadge";
import { formatRelative } from "../../lib/date-time";
import {
  OPERATOR_STATUS_BADGE,
  OPERATOR_STATUS_LABELS,
} from "../domain/report-machine";
import type { OperatorReport } from "../types";
import "./MapView.css";

export interface MapViewProps {
  reports: OperatorReport[];
  selectedId: string | null;
  onOpenReport: (reportId: string) => void;
  onBackToList: () => void;
}

/**
 * 지도 뷰 (O2-Map) — map adapter의 mock 구현.
 * Kakao/Naver Maps SDK 키가 없으므로 좌표 기반 mock 지도 패널을 표시한다.
 * 실제 SDK가 연결되면 이 컴포넌트 내부 구현만 교체한다. (docs/operator-mock-api.md)
 * 큐와 같은 필터 상태를 공유하며, 동일 데이터는 리스트로도 접근 가능하다.
 */

/* 제주 전역 bounding box */
const BOUNDS = { minLat: 33.15, maxLat: 33.62, minLng: 126.1, maxLng: 127.0 };
const VIEW_W = 900;
const VIEW_H = 520;

interface Viewport {
  centerLat: number;
  centerLng: number;
  zoom: number; // 1 = 전체, 커질수록 확대
}

const INITIAL_VIEWPORT: Viewport = {
  centerLat: (BOUNDS.minLat + BOUNDS.maxLat) / 2,
  centerLng: (BOUNDS.minLng + BOUNDS.maxLng) / 2,
  zoom: 1,
};

export function MapView({
  reports,
  selectedId,
  onOpenReport,
  onBackToList,
}: MapViewProps) {
  const [viewport, setViewport] = useState<Viewport>(INITIAL_VIEWPORT);
  const [miniCardId, setMiniCardId] = useState<string | null>(null);

  const spanLat = (BOUNDS.maxLat - BOUNDS.minLat) / viewport.zoom;
  const spanLng = (BOUNDS.maxLng - BOUNDS.minLng) / viewport.zoom;

  const project = (lat: number, lng: number) => ({
    x: ((lng - (viewport.centerLng - spanLng / 2)) / spanLng) * VIEW_W,
    y: ((viewport.centerLat + spanLat / 2 - lat) / spanLat) * VIEW_H,
  });

  /* 낮은 줌에서는 그리드 클러스터링 */
  const clusters = useMemo(() => {
    if (viewport.zoom >= 3) return null;
    const cellLat = spanLat / 7;
    const cellLng = spanLng / 10;
    const map = new Map<string, OperatorReport[]>();
    for (const report of reports) {
      const key = `${Math.floor(report.location.latitude / cellLat)}:${Math.floor(report.location.longitude / cellLng)}`;
      const list = map.get(key) ?? [];
      list.push(report);
      map.set(key, list);
    }
    return Array.from(map.values());
  }, [reports, viewport.zoom, spanLat, spanLng]);

  const pan = (dLat: number, dLng: number) =>
    setViewport((v) => ({
      ...v,
      centerLat: v.centerLat + dLat * spanLat * 0.3,
      centerLng: v.centerLng + dLng * spanLng * 0.3,
    }));

  const zoomTo = (zoom: number, lat?: number, lng?: number) =>
    setViewport((v) => ({
      centerLat: lat ?? v.centerLat,
      centerLng: lng ?? v.centerLng,
      zoom: Math.min(8, Math.max(1, zoom)),
    }));

  const miniCard = miniCardId
    ? reports.find((r) => r.reportId === miniCardId)
    : null;

  const renderMarker = (report: OperatorReport) => {
    const { x, y } = project(report.location.latitude, report.location.longitude);
    if (x < -20 || x > VIEW_W + 20 || y < -20 || y > VIEW_H + 20) return null;
    const isSelected = report.reportId === selectedId;
    const triage = report.triage.currentType;
    const isDispatchStatus = report.status === "dispatched";

    return (
      <g
        key={report.reportId}
        className="map-view__marker"
        role="button"
        tabIndex={0}
        aria-label={`사건 ${report.reportId}, ${report.location.address}`}
        onClick={() => setMiniCardId(report.reportId)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setMiniCardId(report.reportId);
          }
        }}
        transform={`translate(${x}, ${y})`}
      >
        {isSelected && <circle r="16" className="map-view__marker-ring" />}
        {triage === "emergency" ? (
          /* 응급: 원형 + 사이렌 아이콘 */
          <>
            <circle r="11" fill="var(--triage-emergency-solid)" />
            <path
              d="M-4 3v-3a4 4 0 018 0v3M-5.5 3h11"
              stroke="#fff"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />
          </>
        ) : isDispatchStatus ? (
          /* 출동: 사각형 + 차량 아이콘 */
          <>
            <rect x="-10" y="-10" width="20" height="20" rx="4" fill="var(--triage-dispatch-text)" />
            <path
              d="M-6 2h12M-5 2v-4h6l3 3v1M-3.2 5.4a1.4 1.4 0 100-2.8 1.4 1.4 0 000 2.8zM3.8 5.4a1.4 1.4 0 100-2.8 1.4 1.4 0 000 2.8z"
              stroke="#fff"
              strokeWidth="1.3"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        ) : triage === "negative" ? (
          /* 부정: 회색 점 */
          <circle r="6" fill="var(--color-text-tertiary)" />
        ) : (
          <circle r="7" fill="var(--color-primary-500)" />
        )}
      </g>
    );
  };

  return (
    <div className="map-view">
      <div className="map-view__notice" role="note">
        지도 SDK(Kakao/Naver) 미연동 — 좌표 기반 mock 지도입니다. 동일 데이터는{" "}
        <button type="button" className="map-view__list-link" onClick={onBackToList}>
          리스트 뷰
        </button>
        에서도 확인할 수 있습니다.
      </div>

      <div className="map-view__stage">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="map-view__svg"
          role="img"
          aria-label={`사건 위치 지도, ${reports.length}건 표시`}
        >
          <rect width={VIEW_W} height={VIEW_H} className="map-view__sea" />
          {/* 제주도 형태의 단순화된 실루엣 (mock) */}
          <ellipse
            cx={project(33.37, 126.55).x}
            cy={project(33.37, 126.55).y}
            rx={(0.42 / spanLng) * VIEW_W}
            ry={(0.19 / spanLat) * VIEW_H}
            className="map-view__land"
          />
          <text
            x={project(33.37, 126.55).x}
            y={project(33.38, 126.55).y}
            className="map-view__land-label"
            textAnchor="middle"
          >
            제주특별자치도 (mock 지도)
          </text>

          {clusters
            ? clusters.map((group) => {
                if (group.length === 1) return renderMarker(group[0]);
                const avgLat =
                  group.reduce((s, r) => s + r.location.latitude, 0) / group.length;
                const avgLng =
                  group.reduce((s, r) => s + r.location.longitude, 0) / group.length;
                const { x, y } = project(avgLat, avgLng);
                if (x < -30 || x > VIEW_W + 30 || y < -30 || y > VIEW_H + 30) {
                  return null;
                }
                const hasEmergency = group.some(
                  (r) => r.triage.currentType === "emergency",
                );
                return (
                  <g
                    key={`cluster-${group[0].reportId}`}
                    className="map-view__marker"
                    role="button"
                    tabIndex={0}
                    aria-label={`사건 ${group.length}건 밀집 지역, 확대하려면 선택`}
                    onClick={() => zoomTo(viewport.zoom * 2, avgLat, avgLng)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        zoomTo(viewport.zoom * 2, avgLat, avgLng);
                      }
                    }}
                    transform={`translate(${x}, ${y})`}
                  >
                    <circle
                      r="16"
                      className={
                        hasEmergency
                          ? "map-view__cluster map-view__cluster--emergency"
                          : "map-view__cluster"
                      }
                    />
                    <text y="4" textAnchor="middle" className="map-view__cluster-count">
                      {group.length}
                    </text>
                  </g>
                );
              })
            : reports.map(renderMarker)}
        </svg>

        <div className="map-view__controls" role="group" aria-label="지도 조작">
          <button type="button" aria-label="확대" onClick={() => zoomTo(viewport.zoom * 2)}>
            +
          </button>
          <button type="button" aria-label="축소" onClick={() => zoomTo(viewport.zoom / 2)}>
            −
          </button>
          <button type="button" aria-label="위로 이동" onClick={() => pan(1, 0)}>
            ↑
          </button>
          <button type="button" aria-label="아래로 이동" onClick={() => pan(-1, 0)}>
            ↓
          </button>
          <button type="button" aria-label="왼쪽으로 이동" onClick={() => pan(0, -1)}>
            ←
          </button>
          <button type="button" aria-label="오른쪽으로 이동" onClick={() => pan(0, 1)}>
            →
          </button>
          <button
            type="button"
            aria-label="전체 보기"
            onClick={() => setViewport(INITIAL_VIEWPORT)}
          >
            ⤢
          </button>
        </div>

        {miniCard && (
          <div className="map-view__mini-card" role="dialog" aria-label={`사건 ${miniCard.reportId} 요약`}>
            <div className="map-view__mini-head">
              <span className="tabular-nums">{miniCard.reportId}</span>
              <button
                type="button"
                aria-label="요약 카드 닫기"
                onClick={() => setMiniCardId(null)}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="map-view__mini-body">
              {miniCard.photos[0] && (
                <img src={miniCard.photos[0].thumbnailUrl} alt="" />
              )}
              <div>
                <div className="map-view__mini-badges">
                  <TriageBadge variant={miniCard.triage.currentType} />
                  <StatusBadge
                    variant={OPERATOR_STATUS_BADGE[miniCard.status]}
                    label={OPERATOR_STATUS_LABELS[miniCard.status]}
                  />
                </div>
                <p className="map-view__mini-summary">{miniCard.triage.summary}</p>
                <p className="map-view__mini-meta">
                  {miniCard.location.address} ·{" "}
                  <span className="tabular-nums">
                    {formatRelative(miniCard.submittedAt)}
                  </span>
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              fullWidth
              onClick={() => onOpenReport(miniCard.reportId)}
            >
              상세 열기
            </Button>
          </div>
        )}
      </div>

      <div className="map-view__legend" aria-label="마커 범례">
        <span>
          <span className="map-view__legend-dot map-view__legend-dot--emergency" />
          응급 (원형·사이렌)
        </span>
        <span>
          <span className="map-view__legend-dot map-view__legend-dot--dispatch" />
          출동 (사각형·차량)
        </span>
        <span>
          <span className="map-view__legend-dot map-view__legend-dot--negative" />
          부정 (회색 점)
        </span>
        <span>
          <span className="map-view__legend-dot map-view__legend-dot--default" />
          기타 처리 중
        </span>
      </div>
    </div>
  );
}
