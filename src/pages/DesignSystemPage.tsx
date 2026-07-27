import { useState } from "react";
import { AppHeader } from "../components/AppHeader";
import { Button } from "../components/Button";
import { BottomCTA } from "../components/BottomCTA";
import { StepIndicator } from "../components/StepIndicator";
import { TriageBadge } from "../components/TriageBadge";
import { StatusBadge } from "../components/StatusBadge";
import { InlineNotice } from "../components/InlineNotice";
import { ProcessTimeline } from "../components/ProcessTimeline";
import { SituationChips, SITUATION_CHIPS } from "../components/SituationChips";
import "./DesignSystemPage.css";

/** 개발용 컴포넌트 미리보기 페이지 */
export function DesignSystemPage() {
  const [chips, setChips] = useState<string[]>(["injured", "near-road"]);

  return (
    <div className="screen">
      <AppHeader title="디자인 시스템" />
      <main className="screen__body ds">
        <section className="ds__section">
          <h2 className="ds__title">Button variants</h2>
          <div className="ds__row">
            <Button variant="primary">주요 행동</Button>
            <Button variant="secondary">보조 행동</Button>
            <Button variant="tertiary">텍스트 버튼</Button>
          </div>
          <div className="ds__row">
            <Button variant="destructive">위험 행동</Button>
            <Button variant="emergency-solid">지금 바로 신고</Button>
          </div>
          <div className="ds__row">
            <Button variant="primary" loading>
              로딩 중
            </Button>
            <Button variant="primary" disabled>
              비활성
            </Button>
          </div>
        </section>

        <section className="ds__section">
          <h2 className="ds__title">TriageBadge</h2>
          <div className="ds__row">
            <TriageBadge variant="emergency" />
            <TriageBadge variant="dispatch" />
            <TriageBadge variant="negative" />
            <TriageBadge variant="analyzing" />
          </div>
          <div className="ds__row">
            <TriageBadge variant="emergency" size="large" />
            <TriageBadge variant="dispatch" size="large" />
          </div>
        </section>

        <section className="ds__section">
          <h2 className="ds__title">StatusBadge</h2>
          <div className="ds__row">
            <StatusBadge variant="pending" label="확인 중" />
            <StatusBadge variant="success" label="보호 중" />
            <StatusBadge variant="transfer" label="기관 전달" />
            <StatusBadge variant="danger" label="긴급" />
            <StatusBadge variant="neutral" label="종결" />
          </div>
        </section>

        <section className="ds__section">
          <h2 className="ds__title">StepIndicator</h2>
          <StepIndicator
            steps={[
              { id: "photo", label: "사진", state: "completed" },
              { id: "location", label: "위치", state: "current" },
              { id: "details", label: "내용", state: "upcoming" },
              { id: "triage", label: "판정", state: "upcoming" },
            ]}
          />
        </section>

        <section className="ds__section">
          <h2 className="ds__title">SituationChips</h2>
          <SituationChips
            chips={SITUATION_CHIPS.slice(0, 4)}
            selected={chips}
            onChange={setChips}
          />
        </section>

        <section className="ds__section">
          <h2 className="ds__title">InlineNotice</h2>
          <InlineNotice variant="info">
            정확한 위치는 담당 기관에서만 확인하며, 공개 화면에는 주변 범위로
            표시됩니다.
          </InlineNotice>
          <InlineNotice variant="warning">
            AI 분석이 지연되어 우선 제보를 접수했어요. 담당자가 사진과 내용을
            확인합니다.
          </InlineNotice>
          <InlineNotice variant="success">
            응급 신고는 중단했어요. 제보 내용은 일반 접수로 전달됩니다.
          </InlineNotice>
          <InlineNotice variant="error">
            위치를 불러오지 못했어요. 주소를 검색해서 직접 지정할 수 있습니다.
          </InlineNotice>
        </section>

        <section className="ds__section">
          <h2 className="ds__title">ProcessTimeline</h2>
          <div className="card">
            <ProcessTimeline
              showTimestamps
              steps={[
                { id: "submitted", label: "제보됨", status: "completed", timestamp: "2026-07-27T09:12:00" },
                { id: "triaged", label: "AI 판정", status: "completed", timestamp: "2026-07-27T09:12:20" },
                { id: "reviewing", label: "확인 중", status: "current" },
                { id: "transferred", label: "기관 전달", status: "upcoming" },
                { id: "dispatched", label: "출동 또는 보호", status: "upcoming" },
                { id: "closed", label: "반환 또는 종결", status: "upcoming" },
              ]}
            />
          </div>
        </section>

        <section className="ds__section">
          <h2 className="ds__title">오류 메시지 예시</h2>
          <p className="ds__text">
            사용자 잘못처럼 표현하지 않는다. 나쁜 예: “올바르게 입력하지
            않았습니다.” 좋은 예: “위치를 불러오지 못했어요. 주소를 검색해서
            직접 지정할 수 있습니다.”
          </p>
        </section>
      </main>
      <BottomCTA label="BottomCTA (기본)" onClick={() => {}} />
    </div>
  );
}
