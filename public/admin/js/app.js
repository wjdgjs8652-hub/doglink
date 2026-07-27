/* ═══════════════════════════════════════════════════════════════════
   DOG-LINK 운영자 콘솔 — 앱 셸
   해시 라우터 / 보호 라우트 / 전역 키보드 워크플로 / 실시간 배선 / 세션 관리
   라우트: #/login · #/queue(?view=list|map&reportId=…&필터) · #/statistics · #/design-system
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const OP = window.OP, DL = window.DL;
  const root = document.getElementById("app");

  function parseHash() {
    const h = location.hash || "#/queue";
    const [path, qs] = h.replace(/^#/, "").split("?");
    return { path: path || "/queue", params: new URLSearchParams(qs || "") };
  }

  let currentPath = null;
  function route() {
    const { path, params } = parseHash();
    const session = OP.auth.currentSession();
    const authed = session && !session.expired;

    if (path === "/login") {
      if (authed) { location.hash = "#/queue"; return; }
      currentPath = path;
      OP.renderLogin(root, params);
      return;
    }
    /* 보호 라우트 — 미인증이면 원래 경로를 보존해 로그인으로 */
    if (!authed) {
      const expired = session && session.expired ? "&expired=1" : "";
      location.hash = `#/login?return=${encodeURIComponent(location.hash || "#/queue")}${expired ? expired : ""}`;
      return;
    }
    OP.auth.touch();

    if (path === "/statistics") { currentPath = path; OP.renderStats(root); return; }
    if (path === "/design-system") { currentPath = path; OP.renderDesignSystem(root); return; }
    if (path.startsWith("/reports/")) {
      /* 좁은 화면 전체 상세 진입용 경로 — 콘솔에서 해당 사건을 연다 */
      const id = decodeURIComponent(path.split("/")[2] || "");
      location.hash = `#/queue?view=list&reportId=${encodeURIComponent(id)}`;
      return;
    }
    currentPath = "/queue";
    OP.renderConsole(root, params);
  }

  window.addEventListener("hashchange", route);

  /* ══════════ 전역 키보드 워크플로 ══════════ */
  const EDITABLE = el => el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable);
  document.addEventListener("keydown", e => {
    if (currentPath !== "/queue") return;
    if (document.querySelector(".dl-dialog-dim")) return; /* 다이얼로그가 열려 있으면 다이얼로그가 처리 */
    const api = OP.consoleApi;

    if (EDITABLE(e.target)) {
      /* 입력 중에는 업무 단축키 비활성 — Esc로 입력을 빠져나오는 것만 허용 */
      if (e.key === "Escape") e.target.blur();
      return;
    }
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); api.moveFocus(1); break;
      case "ArrowUp": e.preventDefault(); api.moveFocus(-1); break;
      case "Enter":
        if (e.target.closest && e.target.closest(".qlist")) { e.preventDefault(); api.enterOnFocus(); }
        break;
      case "Escape": {
        const fsb = document.querySelector(".fsb.open");
        if (fsb) { fsb.classList.remove("open"); break; }
        if (api.ui.selectedId) api.closeDetail();
        break;
      }
      case "/": e.preventDefault(); api.focusSearch(); break;
      case "?": e.preventDefault(); api.openShortcutOverlay(); break;
      case "e": case "E": api.actionByShortcut("E"); break;
      case "p": case "P": api.actionByShortcut("P"); break;
      case "r": case "R": api.actionByShortcut("R"); break;
      case "a": case "A": api.actionByShortcut("A"); break;
    }
  });

  /* ══════════ 실시간(mock) 배선 ══════════ */
  OP.subscribe(ev => {
    if (currentPath === "/queue") OP.consoleApi.onRealtime(ev);
    else if (document.getElementById("refreshMeta")) OP.consoleApi.updateRefreshMeta();
  });
  OP.realtime.startPolling(30000);
  /* 경과 시간·카운터 주기 갱신 — 포커스를 강탈하지 않는다 */
  setInterval(() => { if (currentPath === "/queue") OP.consoleApi.tick(); }, 30000);

  /* ══════════ 세션 만료 감시 ══════════ */
  setInterval(() => {
    if (currentPath === "/login") return;
    const s = OP.auth.currentSession();
    if (!s || s.expired) {
      location.hash = `#/login?expired=1&return=${encodeURIComponent(location.hash || "#/queue")}`;
    }
  }, 15000);

  route();
})();
