/**
 * mock 사진 생성기.
 * 실제 업로드 스토리지가 연결되기 전까지 data URI SVG로 사진을 대체한다.
 * (외부 이미지 요청 없이 오프라인에서 동작)
 */

interface MockPhotoOptions {
  /** 배경 톤 */
  background: string;
  /** 개체 털색 */
  fur: string;
  /** 사진 안에 표기할 라벨 (예: 사건번호·각도) */
  label: string;
}

export function mockDogPhotoUri({ background, fur, label }: MockPhotoOptions): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 360">
  <rect width="480" height="360" fill="${background}"/>
  <rect y="270" width="480" height="90" fill="rgba(16,17,14,0.12)"/>
  <g fill="${fur}">
    <ellipse cx="240" cy="215" rx="86" ry="52"/>
    <circle cx="316" cy="172" r="38"/>
    <path d="M296 142 l-12 -30 22 8 z"/>
    <path d="M338 140 l14 -28 8 24 z"/>
    <rect x="176" y="240" width="16" height="44" rx="7"/>
    <rect x="216" y="248" width="16" height="40" rx="7"/>
    <rect x="262" y="248" width="16" height="40" rx="7"/>
    <rect x="296" y="240" width="16" height="44" rx="7"/>
    <path d="M156 206 q-26 -8 -30 -34 l14 -2 q6 20 22 24 z"/>
  </g>
  <circle cx="328" cy="168" r="4" fill="#10110E"/>
  <text x="16" y="342" font-family="sans-serif" font-size="20" fill="rgba(255,255,255,0.92)">${label}</text>
  <text x="464" y="30" text-anchor="end" font-family="sans-serif" font-size="14" fill="rgba(255,255,255,0.75)">MOCK PHOTO</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const PHOTO_TONES = [
  { background: "#6B7F70", fur: "#1E1B18" }, // 검은 개체
  { background: "#8A9AA8", fur: "#5A4632" }, // 갈색 개체
  { background: "#7D8A6E", fur: "#C9B18C" }, // 밝은 갈색
  { background: "#94867B", fur: "#E8E2D6" }, // 흰 개체
  { background: "#71808F", fur: "#3B3F45" }, // 회색 개체
];
