import type {
  AuditActor,
  AuditLogEntry,
  MatchCandidate,
  OperatorReport,
  OperatorReportPhoto,
  OperatorStatus,
  OperatorSummary,
  ProcessEvent,
  TriageDecision,
} from "../types";
import { OPERATOR_STATUS_LABELS, TRIAGE_LABELS } from "../domain/report-machine";
import { PHOTO_TONES, mockDogPhotoUri } from "./mock-photos";

/**
 * 운영자 콘솔 mock 초기 데이터.
 * 한국어 실제형 더미 데이터만 사용한다. (실존 인물·실제 개인정보 아님)
 */

export const SYSTEM_ACTOR: AuditActor = { type: "system", displayName: "DOG-LINK 시스템" };

export const SEED_OPERATORS: OperatorSummary[] = [
  { id: "op-kim", displayName: "김담당", organizationName: "제주시 동물보호팀" },
  { id: "op-park", displayName: "박주무관", organizationName: "서귀포시 동물보호센터" },
  { id: "op-lee", displayName: "이주임", organizationName: "제주시 동물보호팀" },
];

const [KIM, PARK, LEE] = SEED_OPERATORS;

let auditSeq = 0;
function auditId(): string {
  auditSeq += 1;
  return `seed-audit-${auditSeq}`;
}

interface StatusStep {
  status: OperatorStatus;
  minutesAgo: number;
  actor?: AuditActor;
}

interface SeedSpec {
  reportId: string;
  submittedMinutesAgo: number;
  /** submitted 이후의 상태 경로 (submitted 자체는 자동 생성) */
  path: StatusStep[];
  triage: TriageDecision;
  address: string;
  latitude: number;
  longitude: number;
  description?: string;
  observedMinutesAgo?: number;
  situationTags: string[];
  photoCount: number;
  photoTone: number;
  assignee?: OperatorSummary;
  isEmergencyAutoSubmitted?: boolean;
  matchCandidates?: MatchCandidate[];
  mergedReportIds?: string[];
  mergedIntoReportId?: string;
  linkedReportIds?: string[];
  closure?: OperatorReport["closure"];
}

function iso(now: Date, minutesAgo: number): string {
  return new Date(now.getTime() - minutesAgo * 60000).toISOString();
}

function buildPhotos(spec: SeedSpec): OperatorReportPhoto[] {
  const tone = PHOTO_TONES[spec.photoTone % PHOTO_TONES.length];
  return Array.from({ length: spec.photoCount }, (_, i) => {
    const uri = mockDogPhotoUri({
      ...tone,
      label: `${spec.reportId} · 사진 ${i + 1}`,
    });
    return {
      id: `${spec.reportId}-photo-${i + 1}`,
      thumbnailUrl: uri,
      originalUrl: uri,
      alt: `제보 사진 ${i + 1}: ${spec.address} 인근에서 발견된 개로 제보된 모습 (mock 이미지)`,
    };
  });
}

function buildReport(now: Date, spec: SeedSpec): OperatorReport {
  const submittedAt = iso(now, spec.submittedMinutesAgo);
  const timeline: ProcessEvent[] = [
    {
      id: `${spec.reportId}-ev-submitted`,
      status: "submitted",
      occurredAt: submittedAt,
      actor: SYSTEM_ACTOR,
    },
    ...spec.path.map((step, i) => ({
      id: `${spec.reportId}-ev-${i}-${step.status}`,
      status: step.status,
      occurredAt: iso(now, step.minutesAgo),
      actor: step.actor,
    })),
  ];

  const auditLog: AuditLogEntry[] = [
    {
      id: auditId(),
      reportId: spec.reportId,
      action: "report_created",
      actor: SYSTEM_ACTOR,
      occurredAt: submittedAt,
      after: spec.isEmergencyAutoSubmitted
        ? "시민 확인 후 자동 접수"
        : "시민 제보 접수",
    },
  ];

  if (spec.assignee) {
    auditLog.push({
      id: auditId(),
      reportId: spec.reportId,
      action: "assigned",
      actor: spec.assignee,
      occurredAt: timeline[Math.min(1, timeline.length - 1)].occurredAt,
      after: `${spec.assignee.displayName} 배정`,
    });
  }

  let prev: OperatorStatus = "submitted";
  for (const step of spec.path) {
    auditLog.push({
      id: auditId(),
      reportId: spec.reportId,
      action: step.status === "closed" || step.status === "negative_closed" ? "closed" : "status_changed",
      actor: step.actor ?? SYSTEM_ACTOR,
      occurredAt: iso(now, step.minutesAgo),
      before: OPERATOR_STATUS_LABELS[prev],
      after: OPERATOR_STATUS_LABELS[step.status],
    });
    prev = step.status;
  }

  if (spec.triage.overriddenAt && spec.triage.overriddenBy) {
    auditLog.push({
      id: auditId(),
      reportId: spec.reportId,
      action: "triage_overridden",
      actor: spec.triage.overriddenBy,
      occurredAt: spec.triage.overriddenAt,
      before: TRIAGE_LABELS[spec.triage.originalType],
      after: TRIAGE_LABELS[spec.triage.currentType],
      reason: spec.triage.overrideNote,
    });
  }

  const status = spec.path.length > 0 ? spec.path[spec.path.length - 1].status : "submitted";
  const updatedAt =
    spec.path.length > 0
      ? iso(now, spec.path[spec.path.length - 1].minutesAgo)
      : submittedAt;

  return {
    reportId: spec.reportId,
    submittedAt,
    updatedAt,
    photos: buildPhotos(spec),
    location: {
      latitude: spec.latitude,
      longitude: spec.longitude,
      address: spec.address,
    },
    reporterContext: {
      observedAt:
        spec.observedMinutesAgo !== undefined
          ? iso(now, spec.observedMinutesAgo)
          : undefined,
      description: spec.description,
      situationTags: spec.situationTags,
    },
    triage: spec.triage,
    status,
    assignee: spec.assignee,
    timeline,
    isEmergencyAutoSubmitted: spec.isEmergencyAutoSubmitted ?? false,
    matchCandidates: spec.matchCandidates ?? [],
    linkedReportIds: spec.linkedReportIds ?? [],
    mergedIntoReportId: spec.mergedIntoReportId,
    mergedReportIds: spec.mergedReportIds ?? [],
    closure: spec.closure,
    auditLog: auditLog.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt)),
  };
}

export function buildSeedReports(now: Date): OperatorReport[] {
  const candidatePhoto = (tone: number, label: string) =>
    mockDogPhotoUri({ ...PHOTO_TONES[tone % PHOTO_TONES.length], label });

  const specs: SeedSpec[] = [
    {
      reportId: "JJ-4818",
      submittedMinutesAgo: 17,
      path: [{ status: "reviewing", minutesAgo: 14, actor: KIM }],
      triage: {
        originalType: "emergency",
        currentType: "emergency",
        summary: "왼쪽 뒷다리 부상이 의심되며 움직임이 적어 보입니다.",
        confidence: 0.91,
        analyzedAt: undefined,
      },
      address: "제주특별자치도 서귀포시 중문동 중문관광단지 서측 산책로",
      latitude: 33.2496,
      longitude: 126.412,
      description:
        "산책로 벤치 아래에 웅크리고 있어요. 다리를 절뚝이고 사람이 다가가도 움직이지 못합니다.",
      observedMinutesAgo: 25,
      situationTags: ["부상 의심", "움직임 없음", "목줄 있음"],
      photoCount: 3,
      photoTone: 0,
      assignee: KIM,
      isEmergencyAutoSubmitted: true,
      matchCandidates: [
        {
          candidateId: "M-2207",
          candidateType: "missing_report",
          title: "실종 신고 M-2207 · 초코",
          photoUrl: candidatePhoto(0, "M-2207 · 초코"),
          photoAlt: "실종 신고 M-2207에 등록된 개 사진 (mock 이미지)",
          reportedAt: iso(now, 60 * 47),
          address: "제주특별자치도 서귀포시 중문동",
          distanceMeters: 850,
          timeDifferenceMinutes: 60 * 47 - 17,
          score: 0.86,
          evidence: [
            { label: "털색", detail: "검은색 일치" },
            { label: "크기", detail: "중형 일치" },
            { label: "목줄", detail: "붉은 목줄 일치" },
            { label: "거리", detail: "실종 지점에서 약 850m" },
          ],
        },
        {
          candidateId: "JJ-8830",
          candidateType: "report",
          title: "제보 JJ-8830",
          photoUrl: candidatePhoto(4, "JJ-8830"),
          photoAlt: "제보 JJ-8830의 첫 번째 사진 (mock 이미지)",
          reportedAt: iso(now, 60 * 26),
          address: "제주특별자치도 서귀포시 서홍동 서홍공원 입구",
          distanceMeters: 6400,
          timeDifferenceMinutes: 60 * 26 - 17,
          score: 0.61,
          evidence: [
            { label: "털색", detail: "어두운 계열 유사" },
            { label: "크기", detail: "중형 일치" },
            { label: "거리", detail: "약 6.4km — 참고 필요" },
          ],
        },
      ],
    },
    {
      reportId: "JJ-3271",
      submittedMinutesAgo: 6,
      path: [],
      triage: {
        originalType: "emergency",
        currentType: "emergency",
        summary: "도로변에 있어 교통사고 위험이 높아 보입니다.",
        confidence: 0.84,
      },
      address: "제주특별자치도 제주시 연동 신시가지 이면도로",
      latitude: 33.489,
      longitude: 126.4983,
      description: "왕복 4차선 도로 옆 인도에서 차도로 자꾸 내려가려고 해요.",
      observedMinutesAgo: 10,
      situationTags: ["도로 주변", "배회"],
      photoCount: 2,
      photoTone: 1,
    },
    {
      reportId: "JJ-1502",
      submittedMinutesAgo: 3,
      path: [],
      triage: {
        originalType: "analyzing",
        currentType: "analyzing",
        summary: "사진을 분석하고 있습니다. 잠시 후 판정 결과가 표시됩니다.",
      },
      address: "제주특별자치도 제주시 화북일동 화북포구 인근",
      latitude: 33.5205,
      longitude: 126.5716,
      description: "포구 방파제 근처를 혼자 돌아다니고 있습니다.",
      situationTags: ["배회"],
      photoCount: 1,
      photoTone: 2,
    },
    {
      reportId: "JJ-2954",
      submittedMinutesAgo: 42,
      path: [{ status: "reviewing", minutesAgo: 35, actor: LEE }],
      triage: {
        originalType: "dispatch",
        currentType: "dispatch",
        summary: "목줄 없이 배회 중이며 사람을 경계하는 모습입니다.",
        confidence: 0.77,
      },
      address: "제주특별자치도 제주시 노형동 근린공원 동쪽 출입구",
      latitude: 33.4855,
      longitude: 126.4788,
      description: "공원 산책로를 계속 돌고 있어요. 마른 편이고 겁이 많아 보입니다.",
      observedMinutesAgo: 55,
      situationTags: ["배회", "마른 체형"],
      photoCount: 2,
      photoTone: 3,
      assignee: LEE,
      matchCandidates: [
        {
          candidateId: "JJ-1187",
          candidateType: "report",
          title: "제보 JJ-1187",
          photoUrl: candidatePhoto(3, "JJ-1187"),
          photoAlt: "제보 JJ-1187의 첫 번째 사진 (mock 이미지)",
          reportedAt: iso(now, 132),
          address: "제주특별자치도 제주시 애월읍 하귀리 해안도로",
          distanceMeters: 7800,
          timeDifferenceMinutes: 90,
          score: 0.74,
          evidence: [
            { label: "털색", detail: "밝은 갈색 일치" },
            { label: "무늬", detail: "가슴 흰 반점 유사" },
            { label: "시간", detail: "약 1시간 30분 간격" },
          ],
        },
      ],
    },
    {
      reportId: "JJ-1187",
      submittedMinutesAgo: 132,
      path: [],
      triage: {
        originalType: "dispatch",
        currentType: "dispatch",
        summary: "목줄이 없고 해안도로 갓길을 따라 이동 중입니다.",
        confidence: 0.71,
      },
      address: "제주특별자치도 제주시 애월읍 하귀리 해안도로",
      latitude: 33.4794,
      longitude: 126.4022,
      description: "해안도로를 따라 서쪽으로 걸어가고 있었습니다.",
      observedMinutesAgo: 140,
      situationTags: ["배회", "목줄 없음"],
      photoCount: 1,
      photoTone: 3,
    },
    {
      reportId: "JJ-7743",
      submittedMinutesAgo: 210,
      path: [
        { status: "reviewing", minutesAgo: 195, actor: KIM },
        { status: "dispatched", minutesAgo: 160, actor: KIM },
      ],
      triage: {
        originalType: "dispatch",
        currentType: "emergency",
        summary: "재확인 결과 뒷다리 출혈이 관찰되어 응급 대응이 필요해 보입니다.",
        confidence: 0.68,
        overriddenAt: iso(now, 180),
        overriddenBy: KIM,
        overrideReason: "condition_changed",
        overrideNote: "제보자 추가 연락으로 출혈 확인, 응급 상향",
      },
      address: "제주특별자치도 서귀포시 대정읍 하모리 체육공원 뒤편",
      latitude: 33.2201,
      longitude: 126.2519,
      description: "풀숲에 숨어 있는데 뒷다리 쪽 털에 피가 묻어 있는 것 같습니다.",
      observedMinutesAgo: 220,
      situationTags: ["부상 의심", "은신"],
      photoCount: 2,
      photoTone: 4,
      assignee: KIM,
    },
    {
      reportId: "JJ-6402",
      submittedMinutesAgo: 60 * 25,
      path: [{ status: "reviewing", minutesAgo: 60 * 24, actor: PARK }],
      triage: {
        originalType: "emergency",
        currentType: "dispatch",
        summary: "사진 재검토 결과 부상 흔적이 확인되지 않아 확인 필요로 조정했습니다.",
        confidence: 0.58,
        overriddenAt: iso(now, 60 * 24 + 30),
        overriddenBy: PARK,
        overrideReason: "false_positive",
        overrideNote: "그림자가 상처로 오인된 것으로 판단",
      },
      address: "제주특별자치도 서귀포시 성산읍 고성리 마을회관 앞",
      latitude: 33.4426,
      longitude: 126.9127,
      description: "회관 앞 공터에 며칠째 나타난다고 합니다.",
      situationTags: ["배회", "반복 목격"],
      photoCount: 1,
      photoTone: 1,
      assignee: PARK,
    },
    {
      reportId: "JJ-5521",
      submittedMinutesAgo: 60 * 5,
      path: [],
      triage: {
        originalType: "negative",
        currentType: "negative",
        summary: "목줄과 인식표가 있어 보호자 동반 산책 중일 가능성이 높습니다.",
        confidence: 0.88,
      },
      address: "제주특별자치도 제주시 이도이동 주민센터 앞 골목",
      latitude: 33.5003,
      longitude: 126.5296,
      description: "골목에 잠깐 혼자 있었는데 곧 주인이 온 것 같기도 합니다.",
      situationTags: ["목줄 있음", "인식표"],
      photoCount: 1,
      photoTone: 2,
    },
    {
      reportId: "JJ-8830",
      submittedMinutesAgo: 60 * 26,
      path: [
        { status: "reviewing", minutesAgo: 60 * 25, actor: PARK },
        { status: "transferred", minutesAgo: 60 * 22, actor: PARK },
      ],
      triage: {
        originalType: "dispatch",
        currentType: "dispatch",
        summary: "야윈 상태로 쓰레기봉투를 뒤지고 있어 보호 확인이 필요합니다.",
        confidence: 0.79,
      },
      address: "제주특별자치도 서귀포시 서홍동 서홍공원 입구",
      latitude: 33.2599,
      longitude: 126.5539,
      description: "공원 입구 화단 근처에서 이틀째 목격됩니다.",
      situationTags: ["마른 체형", "반복 목격"],
      photoCount: 2,
      photoTone: 4,
      assignee: PARK,
    },
    {
      reportId: "JJ-9105",
      submittedMinutesAgo: 60 * 49,
      path: [
        { status: "reviewing", minutesAgo: 60 * 48, actor: KIM },
        { status: "dispatched", minutesAgo: 60 * 47, actor: KIM },
        { status: "protected", minutesAgo: 60 * 44, actor: KIM },
      ],
      triage: {
        originalType: "emergency",
        currentType: "emergency",
        summary: "차량 접촉이 의심되는 자세로 도로변에 누워 있습니다.",
        confidence: 0.93,
      },
      address: "제주특별자치도 제주시 아라일동 산록도로 갓길",
      latitude: 33.4581,
      longitude: 126.5477,
      description: "갓길에 누워서 잘 일어나지 못합니다. 응급 조치가 필요해 보여요.",
      situationTags: ["부상 의심", "도로 주변"],
      photoCount: 3,
      photoTone: 0,
      assignee: KIM,
      isEmergencyAutoSubmitted: true,
    },
    {
      reportId: "JJ-0417",
      submittedMinutesAgo: 60 * 74,
      path: [
        { status: "reviewing", minutesAgo: 60 * 73, actor: LEE },
        { status: "transferred", minutesAgo: 60 * 70, actor: LEE },
        { status: "returned", minutesAgo: 60 * 50, actor: LEE },
      ],
      triage: {
        originalType: "dispatch",
        currentType: "dispatch",
        summary: "인식표가 있어 보호자 확인 가능성이 높습니다.",
        confidence: 0.81,
      },
      address: "제주특별자치도 제주시 삼도일동 관덕정 인근",
      latitude: 33.5135,
      longitude: 126.5219,
      description: "인식표에 전화번호가 보입니다.",
      situationTags: ["인식표", "목줄 있음"],
      photoCount: 1,
      photoTone: 1,
      assignee: LEE,
    },
    {
      reportId: "JJ-2260",
      submittedMinutesAgo: 60 * 98,
      path: [{ status: "negative_closed", minutesAgo: 60 * 96, actor: LEE }],
      triage: {
        originalType: "negative",
        currentType: "negative",
        summary: "마당이 있는 주택 앞이며 관리되는 반려견으로 보입니다.",
        confidence: 0.9,
      },
      address: "제주특별자치도 제주시 외도일동 주택가",
      latitude: 33.4903,
      longitude: 126.4321,
      situationTags: ["목줄 있음"],
      photoCount: 1,
      photoTone: 2,
      assignee: LEE,
      closure: {
        outcome: "negative_or_mistake",
        note: "거주지 마당 반려견으로 확인",
        closedAt: iso(now, 60 * 96),
        closedBy: LEE,
      },
    },
    {
      reportId: "JJ-7089",
      submittedMinutesAgo: 60 * 146,
      path: [
        { status: "reviewing", minutesAgo: 60 * 145, actor: PARK },
        { status: "transferred", minutesAgo: 60 * 142, actor: PARK },
        { status: "protected", minutesAgo: 60 * 130, actor: PARK },
        { status: "closed", minutesAgo: 60 * 120, actor: PARK },
      ],
      triage: {
        originalType: "dispatch",
        currentType: "dispatch",
        summary: "장기간 배회한 것으로 보이며 보호 조치가 필요합니다.",
        confidence: 0.75,
      },
      address: "제주특별자치도 서귀포시 중앙로 매일올레시장 인근",
      latitude: 33.2495,
      longitude: 126.5637,
      situationTags: ["배회", "마른 체형"],
      photoCount: 2,
      photoTone: 1,
      assignee: PARK,
      mergedReportIds: ["JJ-7090"],
      closure: {
        outcome: "shelter_transfer",
        note: "서귀포 보호소 인계 완료",
        closedAt: iso(now, 60 * 120),
        closedBy: PARK,
      },
    },
    {
      reportId: "JJ-7090",
      submittedMinutesAgo: 60 * 144,
      path: [],
      triage: {
        originalType: "dispatch",
        currentType: "dispatch",
        summary: "시장 골목에서 배회하는 개로 제보되었습니다.",
        confidence: 0.72,
      },
      address: "제주특별자치도 서귀포시 중앙로62번길",
      latitude: 33.2493,
      longitude: 126.5641,
      situationTags: ["배회"],
      photoCount: 1,
      photoTone: 1,
      mergedIntoReportId: "JJ-7089",
    },
  ];

  const reports = specs.map((spec) => buildReport(now, spec));

  /* 병합 감사 로그 보강 (JJ-7089 ← JJ-7090) */
  const rep = reports.find((r) => r.reportId === "JJ-7089");
  if (rep) {
    rep.auditLog.push({
      id: auditId(),
      reportId: "JJ-7089",
      action: "report_merged",
      actor: PARK,
      occurredAt: iso(now, 60 * 128),
      before: "JJ-7090 개별 사건",
      after: "JJ-7090 → JJ-7089 병합 (원 기록 보존)",
      reason: "동일 개체 중복 제보",
    });
  }

  return reports;
}
