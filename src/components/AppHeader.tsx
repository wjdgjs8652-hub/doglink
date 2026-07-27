import { BrandLogo } from "./BrandLogo";
import "./AppHeader.css";

export interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
}

export function AppHeader({ title = "DOG-LINK", showBack = false, onBack }: AppHeaderProps) {
  return (
    <header className="app-header">
      {showBack ? (
        <button
          type="button"
          className="app-header__back"
          onClick={onBack}
          aria-label="이전 단계로 돌아가기"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M12.5 4.5L7 10l5.5 5.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ) : (
        <span className="app-header__spacer" aria-hidden="true" />
      )}
      <h1 className="app-header__title">
        {title === "DOG-LINK" ? <BrandLogo size={22} /> : title}
      </h1>
      <span className="app-header__spacer" aria-hidden="true" />
    </header>
  );
}
