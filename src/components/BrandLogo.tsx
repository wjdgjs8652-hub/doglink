import symbolUrl from "../assets/brand-symbol.png";
import "./BrandLogo.css";

export interface BrandLogoProps {
  /** 심볼 높이(px). 워드마크 크기도 이에 비례한다. */
  size?: number;
  /** 워드마크("DogLink") 표시 여부 */
  withText?: boolean;
  className?: string;
}

/** LOGO.png 워드마크에서 샘플링한 브랜드 블루 */
export const BRAND_BLUE = "#4F7EFF";

/** DogLink 브랜드 로고 — 심볼은 원본 이미지(brand-symbol.png)를 그대로 사용한다.
 *  임의로 다시 그리지 말 것. 운영자 정적 콘솔은 shared/brand-symbol.png +
 *  DL.brandSymbolHTML()로 같은 원본을 쓴다. */
export function BrandLogo({ size = 24, withText = true, className }: BrandLogoProps) {
  return (
    <span className={`brand-logo${className ? ` ${className}` : ""}`}>
      <img
        src={symbolUrl}
        alt=""
        aria-hidden="true"
        style={{ height: size, width: "auto" }}
        draggable={false}
      />
      {withText && (
        <span
          className="brand-logo__word"
          style={{ color: BRAND_BLUE, fontSize: Math.round(size * 0.66) }}
        >
          DogLink
        </span>
      )}
    </span>
  );
}
