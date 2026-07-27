import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { BrandLogo } from "../components/BrandLogo";
import "./EntryPage.css";

/** S1. 제보 진입 화면 (QR·링크 접속 첫 화면) */
export function EntryPage() {
  const navigate = useNavigate();

  return (
    <div className="screen entry">
      <main className="entry__main">
        <div className="entry__logo">
          <BrandLogo size={56} />
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
