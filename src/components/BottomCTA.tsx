import type { ReactNode } from "react";
import { Button } from "./Button";
import "./BottomCTA.css";

export interface BottomCTAProps {
  label: string;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  /** 버튼이 비활성인 이유 등 CTA 위에 표시할 안내 */
  helperText?: string;
  /** 보조 액션 (예: 건너뛰기) */
  secondary?: ReactNode;
}

export function BottomCTA({
  label,
  disabled = false,
  loading = false,
  onClick,
  helperText,
  secondary,
}: BottomCTAProps) {
  return (
    <div className="bottom-cta">
      <div className="bottom-cta__inner">
        {helperText && (
          <p className="bottom-cta__helper" aria-live="polite">
            {helperText}
          </p>
        )}
        <Button
          variant="primary"
          size="large"
          fullWidth
          disabled={disabled}
          loading={loading}
          onClick={onClick}
        >
          {label}
        </Button>
        {secondary}
      </div>
    </div>
  );
}
