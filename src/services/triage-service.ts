import type { ReporterDraft, TriageAssessment } from "../types/report";
import { delay } from "./mock-config";

/**
 * AI 상태 판정 서비스 adapter.
 * 실제 AI API가 연결되면 analyze() 구현만 교체한다.
 * UI는 이 인터페이스에만 의존한다.
 */
export interface TriageService {
  analyze(draft: ReporterDraft, signal?: AbortSignal): Promise<TriageAssessment>;
}

/** AI 분석 최대 대기 시간(ms). 초과 시 일반 접수로 전환한다. */
export const TRIAGE_TIMEOUT_MS = 10_000;

/**
 * mock 판정 로직: 선택한 목격 상황 칩을 기반으로 판정을 흉내 낸다.
 * 문구는 비단정 표현 원칙을 따른다.
 */
const mockTriage: TriageService = {
  async analyze(draft, signal) {
    // 실제 분석처럼 2~4초 소요
    await delay(2000 + Math.random() * 2000);
    if (signal?.aborted) {
      throw new DOMException("분석이 중단되었습니다.", "AbortError");
    }

    const s = new Set(draft.situations);
    const now = new Date().toISOString();

    if (s.has("injured") && s.has("not-moving")) {
      return {
        type: "emergency",
        summary:
          "부상이 의심되고 움직임이 적어 보입니다. 빠른 확인이 필요해 보입니다.",
        analyzedAt: now,
        isHumanReviewed: false,
      };
    }
    if (s.has("not-moving") || s.has("injured")) {
      return {
        type: "emergency",
        summary: s.has("injured")
          ? "사진과 제보 내용에서 부상이 의심됩니다."
          : "움직임이 적어 보여 상태 확인이 필요해 보입니다.",
        analyzedAt: now,
        isHumanReviewed: false,
      };
    }
    if (s.has("near-road") || s.has("aggressive") || s.has("puppy")) {
      return {
        type: "dispatch",
        summary: "주변 여건상 담당 기관의 확인이 필요해 보입니다.",
        analyzedAt: now,
        isHumanReviewed: false,
      };
    }
    if (s.has("leashed") && s.size === 1) {
      return {
        type: "negative",
        summary:
          "목줄이 있어 보호자가 있을 가능성이 있습니다. 즉각적인 대응 필요성은 낮아 보입니다.",
        analyzedAt: now,
        isHumanReviewed: false,
      };
    }
    return {
      type: "dispatch",
      summary: "유기·유실 가능성이 있어 담당 기관의 확인이 필요해 보입니다.",
      analyzedAt: now,
      isHumanReviewed: false,
    };
  },
};

export const triageService: TriageService = mockTriage;

/**
 * 타임아웃을 적용한 분석 실행.
 * 시간 초과 또는 오류 시 "unavailable" 판정을 반환해
 * 어떤 경우에도 제보 접수가 진행되도록 한다.
 */
export async function analyzeWithTimeout(
  draft: ReporterDraft,
): Promise<TriageAssessment> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TRIAGE_TIMEOUT_MS);
  try {
    return await Promise.race([
      triageService.analyze(draft, controller.signal),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener("abort", () =>
          reject(new DOMException("timeout", "AbortError")),
        );
      }),
    ]);
  } catch {
    return {
      type: "unavailable",
      summary:
        "AI 분석이 지연되어 우선 제보를 접수했어요. 담당자가 사진과 내용을 확인합니다.",
      isHumanReviewed: false,
    };
  } finally {
    clearTimeout(timer);
  }
}
