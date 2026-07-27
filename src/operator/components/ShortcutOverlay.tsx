import { Dialog } from "../../components/Dialog";
import "./ShortcutOverlay.css";

export interface ShortcutOverlayProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS: Array<{ keys: string; description: string }> = [
  { keys: "↑ / ↓", description: "큐 행 이동" },
  { keys: "Enter", description: "선택 사건 상세 열기" },
  { keys: "Esc", description: "상세·오버레이 닫기" },
  { keys: "E", description: "기관 전달 (확인 중 상태에서만)" },
  { keys: "P", description: "보호 처리 (기관 전달·출동 상태에서만)" },
  { keys: "R", description: "반환 처리 (기관 전달·출동 상태에서만)" },
  { keys: "A", description: "나에게 배정" },
  { keys: "/", description: "검색 포커스" },
  { keys: "?", description: "단축키 도움말" },
];

/** `?`로 열고 Esc로 닫는 단축키 도움말. 입력 필드 포커스 중에는 업무 단축키가 비활성화된다. */
export function ShortcutOverlay({ open, onClose }: ShortcutOverlayProps) {
  return (
    <Dialog open={open} title="키보드 단축키" onClose={onClose} width={420}>
      <ul className="shortcut-overlay__list">
        {SHORTCUTS.map((item) => (
          <li key={item.keys} className="shortcut-overlay__row">
            <kbd className="shortcut-overlay__keys">{item.keys}</kbd>
            <span>{item.description}</span>
          </li>
        ))}
      </ul>
      <p className="shortcut-overlay__note">
        입력 필드에 포커스가 있는 동안 업무 단축키는 동작하지 않습니다. 상태 변경
        단축키는 현재 상태에서 허용되는 경우에만 실행되며, 버튼과 같은 확인 절차를
        거칩니다.
      </p>
    </Dialog>
  );
}
