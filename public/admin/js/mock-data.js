/* ═══════════════════════════════════════════════════════════════════
   DOG-LINK 운영자 콘솔 — mock 데이터 (한국어 실제형 더미)
   ⚠ 전부 시연용 mock이다. 실제 인물·연락처·행정 데이터가 아니며,
   실제 백엔드 연동 시 services.js의 adapter만 교체한다.
   좌표계: 시민 프로토타입과 동일한 제주도 SVG 화면 좌표(viewBox 720×380).
   운영자 화면용 위·경도는 화면 좌표에서 환산한 시연용 값이다.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const now = Date.now();
  const ago = min => new Date(now - min * 60000);
  const agoSec = sec => new Date(now - sec * 1000);

  /* 화면 좌표 → 시연용 위·경도 (제주 대략 범위에 선형 사상) */
  function toLatLng(x, y) {
    const lng = 126.16 + ((x - 84) / 566) * 0.79;
    const lat = 33.56 - ((y - 88) / 228) * 0.36;
    return { latitude: Math.round(lat * 10000) / 10000, longitude: Math.round(lng * 10000) / 10000 };
  }

  /* 운영자 계정 (mock) */
  const OPERATORS = [
    { id: "op-kim",  displayName: "김담당",   organizationName: "제주특별자치도 동물방역과" },
    { id: "op-park", displayName: "박주무관", organizationName: "제주시 동물복지과" },
    { id: "op-lee",  displayName: "이주무관", organizationName: "제주동물보호센터" },
  ];
  const SYSTEM = { type: "system", displayName: "DOG-LINK 시스템" };

  let auditSeq = 0;
  const audit = (reportId, action, actor, occurredAt, extra = {}) =>
    Object.assign({ id: `AUD-${++auditSeq}`, reportId, action, actor, occurredAt }, extra);

  /* 제보 원본 — OperatorReport 구조 (프롬프트 §11 기준) */
  function makeReport(o) {
    const ll = toLatLng(o.x, o.y);
    return {
      reportId: o.id,
      submittedAt: o.t,
      updatedAt: o.updatedAt || o.t,
      photos: o.photos.map((p, i) => ({ id: `${o.id}-P${i + 1}`, coat: p.coat, patt: p.patt || "", alt: p.alt })),
      location: {
        latitude: ll.latitude, longitude: ll.longitude,
        address: o.address, mapX: o.x, mapY: o.y, region: o.region,
      },
      reporterContext: {
        observedAt: o.observedAt ?? o.t,
        description: o.desc ?? "",
        situationTags: o.tags || [],
      },
      triage: {
        originalType: o.triage,
        currentType: o.triageNow || o.triage,
        summary: o.triBasis,
        confidence: o.conf,
        analyzedAt: o.analyzedAt || o.t,
        overriddenAt: o.overriddenAt, overriddenBy: o.overriddenBy,
        overrideReason: o.overrideReason, overrideNote: o.overrideNote,
      },
      status: o.status,
      assignee: o.assignee,
      timeline: o.timeline,
      isEmergencyAutoSubmitted: !!o.auto,
      linkedReportIds: o.linked || [],
      mergedIntoReportId: o.mergedInto,
      closure: o.closure,
      auditLog: o.auditLog,
      /* 매칭 비교용 특징 (AI 요약의 구조화 필드) */
      features: { coat: o.coat, size: o.size, patt: o.patt, collar: o.collar },
      aiSummary: o.aiSummary,
    };
  }

  const REPORTS = [
    /* ── 응급 · 미처리 17분 경과 (최장 대기 — 카운터 병기 대상) ── */
    makeReport({
      id: "JJ-4823", t: ago(17), status: "submitted",
      x: 214, y: 168, address: "제주특별자치도 제주시 노형동 ○○빌라 앞 골목", region: "제주시",
      coat: "갈색", size: "소형견", patt: "단색", collar: "없음",
      aiSummary: "갈색 소형견, 뒷다리 절뚝임, 목줄 없음",
      triage: "emergency", conf: 0.91,
      triBasis: "뒷다리 절뚝임과 움직임 둔화가 관찰되어 부상이 의심됩니다.",
      desc: "골목 안쪽에서 잘 못 걷는 강아지를 봤어요. 뒷다리를 절뚝거리고 사람을 피해서 구석에 있습니다.",
      tags: ["부상 의심", "움직임 둔화"],
      photos: [
        { coat: "갈색", patt: "단색", alt: "골목에서 촬영된 갈색 소형견. AI가 뒷다리 부상을 의심한 사진" },
        { coat: "갈색", patt: "단색", alt: "같은 개체를 다른 각도에서 촬영한 사진" },
      ],
      timeline: [
        { id: "E1", status: "submitted", occurredAt: ago(17), actor: SYSTEM },
      ],
      auditLog: [
        audit("JJ-4823", "report_created", SYSTEM, ago(17), { reason: "시민 제보 접수" }),
      ],
    }),

    /* ── 응급 · 자동신고 5분 전 (시민 확인 후 자동 접수 — 초 단위 이력) ── */
    makeReport({
      id: "JJ-4824", t: agoSec(300), status: "submitted", auto: true,
      x: 470, y: 282, address: "제주특별자치도 서귀포시 동홍동 ○○공원 동쪽 출입구", region: "서귀포시",
      coat: "검정", size: "중형견", patt: "가슴 흰 무늬", collar: "빨간 목줄",
      aiSummary: "검은 중형견, 붉은 목줄, 왼쪽 뒷다리 부상 의심",
      triage: "emergency", conf: 0.88,
      triBasis: "왼쪽 뒷다리 부상이 의심되며 움직임이 적어 보입니다.",
      desc: "공원 출입구 옆에 누워 있는 개를 발견했습니다. 다리에 상처가 있는 것 같아요.",
      tags: ["부상 의심", "도로 인접"],
      observedAt: agoSec(340),
      photos: [{ coat: "검정", patt: "가슴 흰 무늬", alt: "공원 출입구에서 촬영된 검은 중형견. AI가 왼쪽 뒷다리 부상을 의심한 사진" }],
      timeline: [
        { id: "E2", status: "submitted", occurredAt: agoSec(300), actor: SYSTEM, note: "시민 확인 후 자동 접수" },
      ],
      auditLog: [
        audit("JJ-4824", "report_created", SYSTEM, agoSec(300),
          { reason: "응급 자동신고 — 시민 확인 후 자동 접수 (카운트다운 확인 완료)" }),
      ],
    }),

    /* ── 응급 · 확인 중 (배정 완료 — 미처리 카운터 제외) ── */
    makeReport({
      id: "JJ-4818", t: ago(95), updatedAt: ago(21), status: "reviewing",
      x: 222, y: 160, address: "제주특별자치도 제주시 연동 ○○아파트 후문", region: "제주시",
      coat: "갈색", size: "소형견", patt: "단색", collar: "없음",
      aiSummary: "갈색 소형견, 뒷다리 절뚝임, 사람 경계",
      triage: "emergency", conf: 0.86,
      triBasis: "뒷다리 절뚝임과 움직임 둔화가 관찰되어 부상이 의심됩니다.",
      desc: "아파트 후문 화단 근처에 다친 것 같은 강아지가 있어요.",
      tags: ["부상 의심"],
      assignee: OPERATORS[1],
      photos: [{ coat: "갈색", patt: "단색", alt: "아파트 후문에서 촬영된 갈색 소형견" }],
      timeline: [
        { id: "E3", status: "submitted", occurredAt: ago(95), actor: SYSTEM },
        { id: "E4", status: "reviewing", occurredAt: ago(21), actor: OPERATORS[1] },
      ],
      auditLog: [
        audit("JJ-4818", "report_created", SYSTEM, ago(95), { reason: "시민 제보 접수" }),
        audit("JJ-4818", "assigned", OPERATORS[1], ago(21), { after: "박주무관" }),
        audit("JJ-4818", "status_changed", OPERATORS[1], ago(21), { before: "submitted", after: "reviewing" }),
      ],
    }),

    /* ── 출동 · 확인 중 ── */
    makeReport({
      id: "JJ-4817", t: ago(38), updatedAt: ago(26), status: "reviewing",
      x: 462, y: 274, address: "제주특별자치도 서귀포시 동홍동 ○○공원 정문", region: "서귀포시",
      coat: "검정", size: "중형견", patt: "가슴 흰 무늬", collar: "빨간 목줄",
      aiSummary: "검은 중형견, 붉은 목줄, 외상 징후 없음",
      triage: "dispatch", conf: 0.79,
      triBasis: "단독으로 배회하고 있으나 외상 징후는 보이지 않습니다.",
      desc: "공원 정문 근처를 혼자 돌아다니는 개가 있습니다. 목줄은 하고 있는데 보호자는 안 보입니다.",
      tags: ["단독 배회", "목줄 있음"],
      assignee: OPERATORS[0],
      photos: [
        { coat: "검정", patt: "가슴 흰 무늬", alt: "공원 정문에서 촬영된 검은 중형견" },
        { coat: "검정", patt: "가슴 흰 무늬", alt: "같은 개체의 측면 사진" },
        { coat: "검정", patt: "가슴 흰 무늬", alt: "같은 개체의 원거리 사진" },
      ],
      timeline: [
        { id: "E5", status: "submitted", occurredAt: ago(38), actor: SYSTEM },
        { id: "E6", status: "reviewing", occurredAt: ago(26), actor: OPERATORS[0] },
      ],
      auditLog: [
        audit("JJ-4817", "report_created", SYSTEM, ago(38), { reason: "시민 제보 접수" }),
        audit("JJ-4817", "assigned", OPERATORS[0], ago(26), { after: "김담당" }),
        audit("JJ-4817", "status_changed", OPERATORS[0], ago(26), { before: "submitted", after: "reviewing" }),
      ],
    }),

    /* ── 출동 · 출동 상태 ── */
    makeReport({
      id: "JJ-4816", t: ago(64), updatedAt: ago(12), status: "dispatched",
      x: 598, y: 172, address: "제주특별자치도 서귀포시 성산읍 ○○리 마을회관 주차장", region: "서귀포시",
      coat: "검정", size: "중형견", patt: "가슴 흰 점", collar: "빨간 목줄",
      aiSummary: "검은 중형견, 가슴 흰 점, 주차장 주변 배회",
      triage: "dispatch", conf: 0.81,
      triBasis: "마을회관 주변을 반복 배회하고 있어 구조 출동 대상으로 판단됩니다.",
      desc: "마을회관 주차장에 개가 이틀째 나타납니다.",
      tags: ["반복 목격"],
      assignee: OPERATORS[2],
      photos: [{ coat: "검정", patt: "가슴 흰 점", alt: "마을회관 주차장에서 촬영된 검은 중형견" }],
      timeline: [
        { id: "E7", status: "submitted", occurredAt: ago(64), actor: SYSTEM },
        { id: "E8", status: "reviewing", occurredAt: ago(41), actor: OPERATORS[2] },
        { id: "E9", status: "dispatched", occurredAt: ago(12), actor: OPERATORS[2] },
      ],
      auditLog: [
        audit("JJ-4816", "report_created", SYSTEM, ago(64), { reason: "시민 제보 접수" }),
        audit("JJ-4816", "assigned", OPERATORS[2], ago(41), { after: "이주무관" }),
        audit("JJ-4816", "status_changed", OPERATORS[2], ago(41), { before: "submitted", after: "reviewing" }),
        audit("JJ-4816", "status_changed", OPERATORS[2], ago(12), { before: "reviewing", after: "dispatched" }),
      ],
    }),

    /* ── 출동 · 기관 전달 ── */
    makeReport({
      id: "JJ-4815", t: ago(150), updatedAt: ago(70), status: "transferred",
      x: 150, y: 236, address: "제주특별자치도 제주시 애월읍 해안도로 ○○카페 인근", region: "제주시",
      coat: "흰색", size: "중형견", patt: "등쪽 갈색 얼룩", collar: "파란 목줄",
      aiSummary: "흰 중형견, 등쪽 갈색 얼룩, 파란 목줄",
      triage: "dispatch", conf: 0.77,
      triBasis: "목줄을 착용한 채 배회하고 있어 유실견 가능성이 있습니다.",
      desc: "해안도로 카페 앞에 목줄 찬 개가 서성입니다.",
      tags: ["목줄 있음", "유실 의심"],
      assignee: OPERATORS[2],
      photos: [{ coat: "흰색", patt: "등쪽 갈색 얼룩", alt: "해안도로에서 촬영된 흰 중형견" }],
      timeline: [
        { id: "E10", status: "submitted", occurredAt: ago(150), actor: SYSTEM },
        { id: "E11", status: "reviewing", occurredAt: ago(128), actor: OPERATORS[2] },
        { id: "E12", status: "transferred", occurredAt: ago(70), actor: OPERATORS[2] },
      ],
      auditLog: [
        audit("JJ-4815", "report_created", SYSTEM, ago(150), { reason: "시민 제보 접수" }),
        audit("JJ-4815", "assigned", OPERATORS[2], ago(128), { after: "이주무관" }),
        audit("JJ-4815", "status_changed", OPERATORS[2], ago(128), { before: "submitted", after: "reviewing" }),
        audit("JJ-4815", "status_changed", OPERATORS[2], ago(70), { before: "reviewing", after: "transferred" }),
      ],
    }),

    /* ── 일반 · 접수됨 (판정 번복 이력 보유 — 원 판정 보존 시연) ── */
    makeReport({
      id: "JJ-4822", t: ago(52), updatedAt: ago(30), status: "submitted",
      x: 320, y: 130, address: "제주특별자치도 제주시 조천읍 ○○초등학교 앞", region: "제주시",
      coat: "베이지", size: "중형견", patt: "단색", collar: "없음",
      aiSummary: "베이지 중형견, 단독 배회",
      triage: "negative", triageNow: "dispatch", conf: 0.64,
      triBasis: "보호자 동반 산책으로 보였으나, 재검토 결과 단독 배회로 확인되었습니다.",
      overriddenAt: ago(30), overriddenBy: OPERATORS[0],
      overrideReason: "false_positive",
      overrideNote: "사진 재검토 결과 보호자가 없는 단독 배회로 확인",
      desc: "학교 앞에 개가 돌아다녀요. 주인은 안 보입니다.",
      tags: ["단독 배회"],
      photos: [{ coat: "베이지", patt: "단색", alt: "초등학교 앞에서 촬영된 베이지색 중형견" }],
      timeline: [
        { id: "E13", status: "submitted", occurredAt: ago(52), actor: SYSTEM },
      ],
      auditLog: [
        audit("JJ-4822", "report_created", SYSTEM, ago(52), { reason: "시민 제보 접수" }),
        audit("JJ-4822", "triage_overridden", OPERATORS[0], ago(30),
          { before: "negative", after: "dispatch", reason: "오탐 — 사진 재검토 결과 보호자가 없는 단독 배회로 확인" }),
      ],
    }),

    /* ── 일반 · 접수됨 (오래된 미처리) ── */
    makeReport({
      id: "JJ-4820", t: ago(320), status: "submitted",
      x: 560, y: 240, address: "제주특별자치도 서귀포시 표선면 ○○리 버스정류장", region: "서귀포시",
      coat: "회색", size: "대형견", patt: "단색", collar: "검정 하네스",
      aiSummary: "회색 대형견, 검정 하네스, 정류장 인근 배회",
      triage: "dispatch", conf: 0.72,
      triBasis: "하네스를 착용한 대형견이 정류장 주변을 배회하고 있습니다.",
      desc: "버스정류장에 큰 개가 계속 있어요. 순한 것 같은데 사람을 따라다닙니다.",
      tags: ["목줄 있음"],
      photos: [{ coat: "회색", patt: "단색", alt: "버스정류장에서 촬영된 회색 대형견" }],
      timeline: [{ id: "E14", status: "submitted", occurredAt: ago(320), actor: SYSTEM }],
      auditLog: [audit("JJ-4820", "report_created", SYSTEM, ago(320), { reason: "시민 제보 접수" })],
    }),

    /* ── 부정 · 접수됨 ── */
    makeReport({
      id: "JJ-4821", t: ago(26), status: "submitted",
      x: 262, y: 148, address: "제주특별자치도 제주시 아라동 ○○공원 산책로", region: "제주시",
      coat: "흰색", size: "소형견", patt: "단색", collar: "분홍 목줄",
      aiSummary: "흰 소형견, 분홍 목줄, 보호자 동반 추정",
      triage: "negative", conf: 0.83,
      triBasis: "인근에 보호자로 추정되는 사람이 함께 있어 대응이 불필요해 보입니다.",
      desc: "공원에 개가 있는데 주인이 잠깐 자리를 비운 것 같기도 해요.",
      tags: [],
      photos: [{ coat: "흰색", patt: "단색", alt: "공원 산책로에서 촬영된 흰 소형견" }],
      timeline: [{ id: "E15", status: "submitted", occurredAt: ago(26), actor: SYSTEM }],
      auditLog: [audit("JJ-4821", "report_created", SYSTEM, ago(26), { reason: "시민 제보 접수" })],
    }),

    /* ── 보호 상태 ── */
    makeReport({
      id: "JJ-4813", t: ago(560), updatedAt: ago(180), status: "protected",
      x: 380, y: 300, address: "제주특별자치도 서귀포시 중문동 ○○사거리", region: "서귀포시",
      coat: "갈색", size: "중형견", patt: "얼굴 흰 얼룩", collar: "없음",
      aiSummary: "갈색 중형견, 얼굴 흰 얼룩",
      triage: "dispatch", conf: 0.8,
      triBasis: "차도 인근을 배회하고 있어 구조 출동 대상으로 판단됩니다.",
      desc: "사거리 근처에서 개가 차 사이로 다녀요.",
      tags: ["도로 인접"],
      assignee: OPERATORS[1],
      photos: [{ coat: "갈색", patt: "얼굴 흰 얼룩", alt: "사거리 인근에서 촬영된 갈색 중형견" }],
      timeline: [
        { id: "E16", status: "submitted", occurredAt: ago(560), actor: SYSTEM },
        { id: "E17", status: "reviewing", occurredAt: ago(540), actor: OPERATORS[1] },
        { id: "E18", status: "dispatched", occurredAt: ago(500), actor: OPERATORS[1] },
        { id: "E19", status: "protected", occurredAt: ago(180), actor: OPERATORS[1] },
      ],
      auditLog: [
        audit("JJ-4813", "report_created", SYSTEM, ago(560), { reason: "시민 제보 접수" }),
        audit("JJ-4813", "assigned", OPERATORS[1], ago(540), { after: "박주무관" }),
        audit("JJ-4813", "status_changed", OPERATORS[1], ago(540), { before: "submitted", after: "reviewing" }),
        audit("JJ-4813", "status_changed", OPERATORS[1], ago(500), { before: "reviewing", after: "dispatched" }),
        audit("JJ-4813", "status_changed", OPERATORS[1], ago(180), { before: "dispatched", after: "protected" }),
      ],
    }),

    /* ── 반환 상태 (실종 신고와 연결됨) ── */
    makeReport({
      id: "JJ-4812", t: ago(900), updatedAt: ago(300), status: "returned",
      x: 156, y: 230, address: "제주특별자치도 제주시 애월읍 해안도로 버스정류장", region: "제주시",
      coat: "흰색", size: "소형견", patt: "등쪽 갈색 얼룩", collar: "없음",
      aiSummary: "흰 소형견, 등쪽 갈색 얼룩",
      triage: "dispatch", conf: 0.75,
      triBasis: "목줄 없이 배회하고 있으나 관리 상태가 좋아 유실견 가능성이 있습니다.",
      desc: "정류장 근처를 돌아다니는 작은 개가 있어요.",
      tags: ["유실 의심"],
      assignee: OPERATORS[2],
      linked: ["LOST-203"],
      photos: [{ coat: "흰색", patt: "등쪽 갈색 얼룩", alt: "버스정류장에서 촬영된 흰 소형견" }],
      timeline: [
        { id: "E20", status: "submitted", occurredAt: ago(900), actor: SYSTEM },
        { id: "E21", status: "reviewing", occurredAt: ago(870), actor: OPERATORS[2] },
        { id: "E22", status: "transferred", occurredAt: ago(800), actor: OPERATORS[2] },
        { id: "E23", status: "returned", occurredAt: ago(300), actor: OPERATORS[2] },
      ],
      auditLog: [
        audit("JJ-4812", "report_created", SYSTEM, ago(900), { reason: "시민 제보 접수" }),
        audit("JJ-4812", "assigned", OPERATORS[2], ago(870), { after: "이주무관" }),
        audit("JJ-4812", "status_changed", OPERATORS[2], ago(870), { before: "submitted", after: "reviewing" }),
        audit("JJ-4812", "status_changed", OPERATORS[2], ago(800), { before: "reviewing", after: "transferred" }),
        audit("JJ-4812", "report_linked", OPERATORS[2], ago(760),
          { after: "LOST-203", reason: "털색·무늬·발견 위치 일치 — 보호자 확인 완료" }),
        audit("JJ-4812", "status_changed", OPERATORS[2], ago(300), { before: "transferred", after: "returned" }),
      ],
    }),

    /* ── 종결 (기본 큐에서 숨김 — 필터로 조회) ── */
    makeReport({
      id: "JJ-4810", t: ago(2200), updatedAt: ago(1500), status: "closed",
      x: 128, y: 210, address: "제주특별자치도 제주시 한림읍 ○○항 방파제 입구", region: "제주시",
      coat: "검정", size: "중형견", patt: "단색", collar: "없음",
      aiSummary: "검은 중형견, 방파제 인근 배회",
      triage: "dispatch", conf: 0.78,
      triBasis: "항구 주변을 배회하고 있어 구조 출동 대상으로 판단됩니다.",
      desc: "방파제 입구에 개가 있습니다.",
      tags: [],
      assignee: OPERATORS[2],
      closure: { result: "shelter", memo: "제주동물보호센터 인계 완료. 동물등록 미확인.", closedAt: ago(1500), closedBy: OPERATORS[2] },
      photos: [{ coat: "검정", patt: "단색", alt: "방파제 입구에서 촬영된 검은 중형견" }],
      timeline: [
        { id: "E24", status: "submitted", occurredAt: ago(2200), actor: SYSTEM },
        { id: "E25", status: "reviewing", occurredAt: ago(2150), actor: OPERATORS[2] },
        { id: "E26", status: "dispatched", occurredAt: ago(2100), actor: OPERATORS[2] },
        { id: "E27", status: "protected", occurredAt: ago(1900), actor: OPERATORS[2] },
        { id: "E28", status: "closed", occurredAt: ago(1500), actor: OPERATORS[2] },
      ],
      auditLog: [
        audit("JJ-4810", "report_created", SYSTEM, ago(2200), { reason: "시민 제보 접수" }),
        audit("JJ-4810", "assigned", OPERATORS[2], ago(2150), { after: "이주무관" }),
        audit("JJ-4810", "status_changed", OPERATORS[2], ago(2150), { before: "submitted", after: "reviewing" }),
        audit("JJ-4810", "status_changed", OPERATORS[2], ago(2100), { before: "reviewing", after: "dispatched" }),
        audit("JJ-4810", "status_changed", OPERATORS[2], ago(1900), { before: "dispatched", after: "protected" }),
        audit("JJ-4810", "closed", OPERATORS[2], ago(1500), { before: "protected", after: "closed", reason: "보호소 인계" }),
      ],
    }),

    /* ── 부정 종결 (기본 큐에서 숨김) ── */
    makeReport({
      id: "JJ-4811", t: ago(1300), updatedAt: ago(1250), status: "negative_closed",
      x: 300, y: 160, address: "제주특별자치도 제주시 오라동 ○○천 산책로", region: "제주시",
      coat: "베이지", size: "소형견", patt: "단색", collar: "분홍 목줄",
      aiSummary: "베이지 소형견, 보호자 동반",
      triage: "negative", conf: 0.9,
      triBasis: "보호자가 리드줄을 잠시 놓친 상황으로 확인되어 대응이 불필요합니다.",
      desc: "개가 혼자 뛰어다니는데 주인이 쫓아가고 있어요.",
      tags: [],
      assignee: OPERATORS[0],
      closure: { result: "negative", memo: "보호자 동반 확인 — 오인 제보.", closedAt: ago(1250), closedBy: OPERATORS[0] },
      photos: [{ coat: "베이지", patt: "단색", alt: "산책로에서 촬영된 베이지색 소형견" }],
      timeline: [
        { id: "E29", status: "submitted", occurredAt: ago(1300), actor: SYSTEM },
        { id: "E30", status: "negative_closed", occurredAt: ago(1250), actor: OPERATORS[0] },
      ],
      auditLog: [
        audit("JJ-4811", "report_created", SYSTEM, ago(1300), { reason: "시민 제보 접수" }),
        audit("JJ-4811", "closed", OPERATORS[0], ago(1250), { before: "submitted", after: "negative_closed", reason: "부정 또는 오인 — 보호자 동반 확인" }),
      ],
    }),
  ];

  /* 실종 신고 (매칭 후보용) — 보호자 연락처는 마스킹된 형태만 보관 */
  const MISSING = [
    { id: "LOST-201", name: "까미", coat: "검정", size: "중형견", patt: "가슴 흰 무늬", collar: "빨간 목줄",
      x: 452, y: 270, reportedAt: ago(180), place: "서귀포시 동홍동에서 실종", guardian: "이○연 (010-****-3172)" },
    { id: "LOST-202", name: "보리", coat: "갈색", size: "대형견", patt: "단색", collar: "검정 하네스",
      x: 222, y: 160, reportedAt: ago(2400), place: "제주시 연동에서 실종", guardian: "강○민 (010-****-8840)" },
    { id: "LOST-203", name: "코코", coat: "흰색", size: "소형견", patt: "등쪽 갈색 얼룩", collar: "없음",
      x: 140, y: 224, reportedAt: ago(1500), place: "제주시 한림읍에서 실종", guardian: "고○수 (010-****-2201)" },
  ];

  /* 시연 이벤트 생성기용 추가 제보 템플릿 (mock realtime) */
  const INCOMING_TEMPLATES = [
    {
      triage: "dispatch", coat: "베이지", size: "중형견", patt: "단색", collar: "없음",
      x: 340, y: 250, address: "제주특별자치도 서귀포시 안덕면 ○○사거리", region: "서귀포시",
      aiSummary: "베이지 중형견, 사거리 인근 배회",
      triBasis: "단독으로 배회하고 있어 구조 출동 대상으로 판단됩니다.",
      desc: "사거리 근처에 개가 혼자 있어요.", tags: ["단독 배회"], conf: 0.74,
    },
    {
      triage: "emergency", coat: "흰색", size: "소형견", patt: "단색", collar: "없음",
      x: 250, y: 200, address: "제주특별자치도 제주시 오등동 ○○교 아래", region: "제주시",
      aiSummary: "흰 소형견, 하천변, 움직임 없음",
      triBasis: "하천변에서 움직임이 거의 없어 응급 상황이 의심됩니다.",
      desc: "다리 아래에 개가 쓰러져 있는 것 같아요.", tags: ["부상 의심", "움직임 둔화"], conf: 0.9, auto: true,
    },
  ];

  window.OP = window.OP || {};
  Object.assign(window.OP, {
    MOCK: { REPORTS, MISSING, OPERATORS, SYSTEM, INCOMING_TEMPLATES, toLatLng },
  });
})();
