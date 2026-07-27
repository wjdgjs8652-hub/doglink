/**
 * 상태 확인 링크 공유 서비스.
 * - Web Share API 지원 시 시스템 공유 시트 사용
 * - 미지원 시 클립보드 복사 폴백
 * - 카카오톡 공유는 SDK 키(VITE_KAKAO_SHARE_KEY)가 준비된 경우에만 adapter로 연결.
 *   키가 없으면 노출하지 않는다. (키를 임의로 생성하지 않음)
 */

export function getStatusUrl(reportId: string): string {
  return `${window.location.origin}/report/status/${encodeURIComponent(reportId)}`;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // 클립보드 API 미지원 폴백
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  }
}

export type ShareOutcome = "shared" | "copied" | "failed";

export async function shareStatusLink(reportId: string): Promise<ShareOutcome> {
  const url = getStatusUrl(reportId);
  const shareData = {
    title: "DOG-LINK 제보 상태 확인",
    text: `제보 접수번호 ${reportId}의 처리 상태를 확인할 수 있어요.`,
    url,
  };
  if (typeof navigator.share === "function") {
    try {
      await navigator.share(shareData);
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return "failed"; // 사용자가 공유 시트를 닫음
      }
      // 공유 실패 시 복사 폴백으로 진행
    }
  }
  return (await copyText(url)) ? "copied" : "failed";
}

/** 카카오톡 공유 adapter: SDK 키가 있을 때만 활성화 */
export function isKakaoShareAvailable(): boolean {
  return Boolean(import.meta.env.VITE_KAKAO_SHARE_KEY);
}

export async function shareViaKakao(_reportId: string): Promise<void> {
  if (!isKakaoShareAvailable()) {
    throw new Error("카카오톡 공유 SDK 키가 설정되지 않았습니다.");
  }
  // TODO: Kakao SDK 로드 및 Kakao.Share.sendDefault 연동 (키 준비 후)
  throw new Error("카카오톡 공유는 아직 연동되지 않았습니다.");
}
