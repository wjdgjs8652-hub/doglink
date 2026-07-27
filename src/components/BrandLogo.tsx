import { useId } from "react";
import "./BrandLogo.css";

export interface BrandLogoProps {
  /** 심볼 한 변 크기(px). 워드마크 크기도 이에 비례한다. */
  size?: number;
  /** 워드마크("DogLink") 표시 여부 */
  withText?: boolean;
  /** 핀·강아지·워드마크 색 — 어두운 배경에서는 "#FFFFFF" */
  fg?: string;
  /** 원형 창·물음표 색 — 어두운 배경에서는 배경색과 동일하게 */
  bg?: string;
  className?: string;
}

export const BRAND_BLUE = "#5B7CFA";

/** DogLink 브랜드 로고 — 위치 핀 + 강아지 실루엣 + 물음표 심볼(SVG)과 워드마크.
 *  운영자 정적 콘솔의 shared/components.js `brandLogoSVG`와 같은 도형을 공유한다. */
export function BrandLogo({
  size = 24,
  withText = true,
  fg = BRAND_BLUE,
  bg = "#FFFFFF",
  className,
}: BrandLogoProps) {
  const clipId = useId();

  return (
    <span className={`brand-logo${className ? ` ${className}` : ""}`}>
      <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden="true" focusable="false">
        <path
          d="M48 4 C67.9 4 84 20.1 84 40 C84 54.2 74.9 64.4 65 73.8 C58.9 79.6 52.7 85.6 48 93 C43.3 85.6 37.1 79.6 31 73.8 C21.1 64.4 12 54.2 12 40 C12 20.1 28.1 4 48 4 Z"
          fill={fg}
        />
        <circle cx="48" cy="40" r="24" fill={bg} />
        <clipPath id={clipId}>
          <circle cx="48" cy="40" r="24" />
        </clipPath>
        <g clipPath={`url(#${clipId})`}>
          <path
            d="M41 66 L41 40 L36 19 L50 30 L57 29 C63 29 68 33 70 38 L73 41 L70 45 C68 48 63 49 58 48 L56 50 L58 66 Z"
            fill={fg}
          />
        </g>
        <text x="52" y="47" textAnchor="middle" fontWeight="800" fontSize="17" fill={bg}>
          ?
        </text>
      </svg>
      {withText && (
        <span className="brand-logo__word" style={{ color: fg, fontSize: Math.round(size * 0.66) }}>
          DogLink
        </span>
      )}
    </span>
  );
}
