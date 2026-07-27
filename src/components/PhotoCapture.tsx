import { useRef, useState } from "react";
import type { ReportPhoto } from "../types/report";
import {
  MAX_PHOTOS,
  PhotoValidationError,
  compressPhoto,
  uploadPhoto,
} from "../services/upload-service";
import { generateId } from "../services/mock-config";
import { Button } from "./Button";
import { InlineNotice } from "./InlineNotice";
import "./PhotoCapture.css";

export interface PhotoCaptureProps {
  photos: ReportPhoto[];
  onChange(photos: ReportPhoto[]): void;
}

/**
 * 사진 촬영·업로드 컴포넌트.
 * - 모바일: capture 속성으로 카메라 실행 우선
 * - 카메라 불가·권한 거부 시 파일 업로드 폴백 (별도 버튼 상시 제공)
 * - 최대 3장, 미리보기, 삭제, 진행률, 오류 복구
 */
export function PhotoCapture({ photos, onChange }: PhotoCaptureProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const photosRef = useRef(photos);
  photosRef.current = photos;

  const updatePhoto = (id: string, patch: Partial<ReportPhoto>) => {
    const next = photosRef.current.map((p) =>
      p.id === id ? { ...p, ...patch } : p,
    );
    photosRef.current = next;
    onChange(next);
  };

  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);

    const room = MAX_PHOTOS - photosRef.current.length;
    if (room <= 0) {
      setError(`사진은 최대 ${MAX_PHOTOS}장까지 올릴 수 있어요.`);
      return;
    }
    const list = Array.from(files).slice(0, room);
    if (files.length > room) {
      setError(`사진은 최대 ${MAX_PHOTOS}장까지 올릴 수 있어 앞의 ${room}장만 추가했어요.`);
    }

    for (const file of list) {
      const id = generateId("photo-");
      try {
        const { dataUrl } = await compressPhoto(file);
        const photo: ReportPhoto = {
          id,
          localUrl: dataUrl,
          status: "uploading",
          progress: 0,
        };
        const next = [...photosRef.current, photo];
        photosRef.current = next;
        onChange(next);

        try {
          const { remoteUrl } = await uploadPhoto(dataUrl, (progress) =>
            updatePhoto(id, { progress }),
          );
          updatePhoto(id, { status: "uploaded", remoteUrl, progress: 100 });
        } catch {
          updatePhoto(id, { status: "error" });
        }
      } catch (err) {
        setError(
          err instanceof PhotoValidationError
            ? err.message
            : "사진을 처리하지 못했어요. 다시 시도해 주세요.",
        );
      }
    }
  };

  const retryUpload = async (photo: ReportPhoto) => {
    if (!photo.localUrl) return;
    updatePhoto(photo.id, { status: "uploading", progress: 0 });
    try {
      const { remoteUrl } = await uploadPhoto(photo.localUrl, (progress) =>
        updatePhoto(photo.id, { progress }),
      );
      updatePhoto(photo.id, { status: "uploaded", remoteUrl, progress: 100 });
    } catch {
      updatePhoto(photo.id, { status: "error" });
    }
  };

  const removePhoto = (id: string) => {
    const next = photosRef.current.filter((p) => p.id !== id);
    photosRef.current = next;
    onChange(next);
    setError(null);
  };

  const canAddMore = photos.length < MAX_PHOTOS;

  return (
    <div className="photo-capture">
      {/* 카메라 우선 (모바일에서 후면 카메라 실행) */}
      <input
        ref={cameraInputRef}
        className="visually-hidden"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          void addFiles(e.target.files);
          e.target.value = "";
        }}
        aria-label="카메라로 동물 사진 촬영"
      />
      {/* 갤러리·파일 업로드 폴백 */}
      <input
        ref={fileInputRef}
        className="visually-hidden"
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          void addFiles(e.target.files);
          e.target.value = "";
        }}
        aria-label="앨범에서 동물 사진 선택"
      />

      {photos.length > 0 && (
        <ul className="photo-capture__grid" aria-label="선택한 사진 목록">
          {photos.map((photo, i) => (
            <li key={photo.id} className="photo-capture__item">
              {photo.localUrl && (
                <img
                  src={photo.localUrl}
                  alt={`제보 사진 ${i + 1}`}
                  className="photo-capture__img"
                />
              )}
              {photo.status === "uploading" && (
                <div
                  className="photo-capture__progress"
                  role="progressbar"
                  aria-valuenow={photo.progress ?? 0}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`사진 ${i + 1} 업로드 진행률`}
                >
                  <span
                    className="photo-capture__progress-bar"
                    style={{ width: `${photo.progress ?? 0}%` }}
                  />
                  <span className="photo-capture__progress-text tabular-nums">
                    {photo.progress ?? 0}%
                  </span>
                </div>
              )}
              {photo.status === "error" && (
                <button
                  type="button"
                  className="photo-capture__retry"
                  onClick={() => void retryUpload(photo)}
                >
                  업로드 실패
                  <br />
                  다시 시도
                </button>
              )}
              <button
                type="button"
                className="photo-capture__remove"
                aria-label={`사진 ${i + 1} 삭제`}
                onClick={() => removePhoto(photo.id)}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path
                    d="M3.5 3.5l7 7M10.5 3.5l-7 7"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      {photos.length === 0 && (
        <button
          type="button"
          className="photo-capture__placeholder"
          onClick={() => cameraInputRef.current?.click()}
        >
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
            <rect x="4" y="10" width="32" height="24" rx="4" stroke="currentColor" strokeWidth="2" />
            <path d="M14 10l2.4-4h7.2L26 10" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <circle cx="20" cy="22" r="6" stroke="currentColor" strokeWidth="2" />
          </svg>
          <span>탭해서 사진 찍기</span>
        </button>
      )}

      <div className="photo-capture__actions">
        <Button
          variant="secondary"
          onClick={() => cameraInputRef.current?.click()}
          disabled={!canAddMore}
        >
          사진 촬영
        </Button>
        <Button
          variant="secondary"
          onClick={() => fileInputRef.current?.click()}
          disabled={!canAddMore}
        >
          앨범에서 선택
        </Button>
      </div>
      <p className="photo-capture__count tabular-nums" aria-live="polite">
        {photos.length} / {MAX_PHOTOS}장
      </p>

      {error && <InlineNotice variant="error">{error}</InlineNotice>}
    </div>
  );
}
