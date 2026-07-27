import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import "./EntryPage.css";

/** S1. 제보 진입 화면 (QR·링크 접속 첫 화면) */
export function EntryPage() {
  const navigate = useNavigate();

  return (
    <div className="screen entry">
      <main className="entry__main">
        <p className="entry__service">DOG-LINK</p>
        <div className="entry__icon" aria-hidden="true">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <path
              d="M14 30c-3.4 0-6-2.8-6-6.4 0-3.5 2.6-6.4 6-6.4s6 2.9 6 6.4c0 3.6-2.6 6.4-6 6.4zM50 30c3.4 0 6-2.8 6-6.4 0-3.5-2.6-6.4-6-6.4s-6 2.9-6 6.4c0 3.6 2.6 6.4 6 6.4zM24 20c-3.4 0-6-2.9-6-6.5S20.6 7 24 7s6 2.9 6 6.5-2.6 6.5-6 6.5zM40 20c3.4 0 6-2.9 6-6.5S43.4 7 40 7s-6 2.9-6 6.5 2.6 6.5 6 6.5z"
              fill="var(--color-primary-100)"
              stroke="var(--color-primary-500)"
              strokeWidth="2"
            />
            <path
              d="M32 26c7 0 10 5.4 12.4 9.8C46.6 40 50 42.4 50 47c0 5-4 9-9 9-3.4 0-5.8-1.6-9-1.6S26.4 56 23 56c-5 0-9-4-9-9 0-4.6 3.4-7 5.6-11.2C22 31.4 25 26 32 26z"
              fill="var(--color-surface)"
              stroke="var(--color-primary-500)"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1 className="entry__headline">유기견을 발견하셨나요?</h1>
        <p className="entry__desc">
          사진 한 장이면 됩니다.
          <br />
          가입 없이 1분 안에 제보할 수 있어요.
        </p>
        <ul className="entry__points">
          <li>앱 설치·회원가입 없음</li>
          <li>사진과 위치만으로 접수</li>
          <li>AI가 정리하고 담당자가 최종 확인</li>
        </ul>
      </main>
      <div className="entry__actions">
        <Button
          variant="primary"
          size="large"
          fullWidth
          onClick={() => navigate("/report/photo")}
        >
          제보 시작하기
        </Button>
        <Link to="/report/status" className="entry__status-link">
          내 제보 상태 확인
        </Link>
      </div>
    </div>
  );
}
