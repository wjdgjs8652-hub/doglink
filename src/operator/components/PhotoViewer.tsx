import { useEffect, useState } from "react";
import { Dialog } from "../../components/Dialog";
import type { OperatorReportPhoto } from "../types";
import "./PhotoViewer.css";

export interface PhotoViewerProps {
  photos: OperatorReportPhoto[];
}

/**
 * 사진 원본 뷰어 (최대 3장): 확대·축소, 이전·다음, 전체 화면, 로드 실패 폴백.
 */
export function PhotoViewer({ photos }: PhotoViewerProps) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setIndex(0);
    setZoom(1);
    setFailed({});
  }, [photos]);

  if (photos.length === 0) {
    return (
      <div className="photo-viewer photo-viewer--empty">
        <p>등록된 사진이 없습니다.</p>
      </div>
    );
  }

  const current = photos[Math.min(index, photos.length - 1)];
  const isFailed = failed[current.id];

  const goTo = (next: number) => {
    setIndex((next + photos.length) % photos.length);
    setZoom(1);
  };

  const image = (className: string) =>
    isFailed ? (
      <div className={`${className} photo-viewer__fallback`} role="img" aria-label="이미지를 불러오지 못했습니다">
        <svg width="28" height="28" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="1.5" y="2.5" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.2" />
          <path d="M3 12l3.4-3.4 2.4 2.4 3-3 2.2 2.2" stroke="currentColor" strokeWidth="1.2" />
        </svg>
        <span>이미지를 불러오지 못했습니다</span>
      </div>
    ) : (
      <img
        className={className}
        src={current.originalUrl ?? current.thumbnailUrl}
        alt={current.alt ?? "제보 사진"}
        style={{ transform: `scale(${zoom})` }}
        onError={() => setFailed((f) => ({ ...f, [current.id]: true }))}
      />
    );

  return (
    <div className="photo-viewer">
      <div className="photo-viewer__stage">
        {image("photo-viewer__image")}
        <div className="photo-viewer__controls">
          <button
            type="button"
            aria-label="사진 축소"
            disabled={zoom <= 1}
            onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
          >
            −
          </button>
          <span className="tabular-nums" aria-live="polite">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            aria-label="사진 확대"
            disabled={zoom >= 3}
            onClick={() => setZoom((z) => Math.min(3, z + 0.5))}
          >
            +
          </button>
          <button
            type="button"
            aria-label="전체 화면 보기"
            onClick={() => setFullscreen(true)}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M1.5 5V1.5H5M9 1.5h3.5V5M12.5 9v3.5H9M5 12.5H1.5V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {photos.length > 1 && (
          <>
            <button
              type="button"
              className="photo-viewer__nav photo-viewer__nav--prev"
              aria-label="이전 사진"
              onClick={() => goTo(index - 1)}
            >
              ‹
            </button>
            <button
              type="button"
              className="photo-viewer__nav photo-viewer__nav--next"
              aria-label="다음 사진"
              onClick={() => goTo(index + 1)}
            >
              ›
            </button>
          </>
        )}
      </div>

      {photos.length > 1 && (
        <div className="photo-viewer__thumbs" role="tablist" aria-label="사진 선택">
          {photos.map((photo, i) => (
            <button
              key={photo.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`사진 ${i + 1} / ${photos.length}`}
              className={
                i === index
                  ? "photo-viewer__thumb photo-viewer__thumb--active"
                  : "photo-viewer__thumb"
              }
              onClick={() => goTo(i)}
            >
              <img src={photo.thumbnailUrl} alt="" />
            </button>
          ))}
        </div>
      )}

      <Dialog
        open={fullscreen}
        title={`사진 전체 화면 (${index + 1}/${photos.length})`}
        onClose={() => setFullscreen(false)}
        width={960}
      >
        <div className="photo-viewer__full">
          {image("photo-viewer__full-image")}
          {photos.length > 1 && (
            <div className="photo-viewer__full-nav">
              <button type="button" onClick={() => goTo(index - 1)}>
                이전
              </button>
              <span className="tabular-nums">
                {index + 1} / {photos.length}
              </span>
              <button type="button" onClick={() => goTo(index + 1)}>
                다음
              </button>
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
}
