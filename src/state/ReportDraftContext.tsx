import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ReportLocation, ReportPhoto, ReporterDraft } from "../types/report";

/**
 * 제보 작성 임시 상태.
 * - 뒤로가기 시 입력값 보존 (메모리 상태)
 * - 새로고침 시 sessionStorage에서 가능한 범위 복원
 * - 제출 성공 후 clearDraft()로 정리 (민감한 위치·사진을 장기 보관하지 않음)
 */

const STORAGE_KEY = "doglink.draft.v1";

const EMPTY_DRAFT: ReporterDraft = {
  photos: [],
  location: null,
  situations: [],
  description: "",
};

interface ReportDraftContextValue {
  draft: ReporterDraft;
  setPhotos(photos: ReportPhoto[]): void;
  setLocation(location: ReportLocation | null): void;
  setSituations(situations: string[]): void;
  setDescription(description: string): void;
  clearDraft(): void;
}

const ReportDraftContext = createContext<ReportDraftContextValue | null>(null);

function loadDraft(): ReporterDraft {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_DRAFT;
    const parsed = JSON.parse(raw) as Partial<ReporterDraft>;
    return {
      photos: Array.isArray(parsed.photos)
        ? parsed.photos.filter((p) => p && p.status === "uploaded")
        : [],
      location: parsed.location ?? null,
      situations: Array.isArray(parsed.situations) ? parsed.situations : [],
      description: typeof parsed.description === "string" ? parsed.description : "",
    };
  } catch {
    return EMPTY_DRAFT;
  }
}

function persistDraft(draft: ReporterDraft): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // 저장 공간 초과(사진 data URL 용량) 시 사진을 제외하고 저장 시도
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...draft, photos: [] }),
      );
    } catch {
      // 복원 불가 환경에서는 메모리 상태만 유지
    }
  }
}

export function ReportDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<ReporterDraft>(loadDraft);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const update = useCallback((patch: Partial<ReporterDraft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      persistDraft(next);
      return next;
    });
  }, []);

  const value = useMemo<ReportDraftContextValue>(
    () => ({
      draft,
      setPhotos: (photos) => update({ photos }),
      setLocation: (location) => update({ location }),
      setSituations: (situations) => update({ situations }),
      setDescription: (description) => update({ description }),
      clearDraft: () => {
        setDraft(EMPTY_DRAFT);
        try {
          sessionStorage.removeItem(STORAGE_KEY);
        } catch {
          // 무시
        }
      },
    }),
    [draft, update],
  );

  return (
    <ReportDraftContext.Provider value={value}>
      {children}
    </ReportDraftContext.Provider>
  );
}

export function useReportDraft(): ReportDraftContextValue {
  const ctx = useContext(ReportDraftContext);
  if (!ctx) {
    throw new Error("useReportDraft must be used within ReportDraftProvider");
  }
  return ctx;
}
