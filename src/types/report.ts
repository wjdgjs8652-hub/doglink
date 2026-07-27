/** 제보 작성 중 임시 데이터 */
export interface ReporterDraft {
  photos: ReportPhoto[];
  location: ReportLocation | null;
  situations: string[];
  description: string;
}

export interface ReportPhoto {
  id: string;
  /** 브라우저 내 미리보기용 data URL (EXIF 제거·리사이즈 후) */
  localUrl?: string;
  remoteUrl?: string;
  status: "idle" | "uploading" | "uploaded" | "error";
  progress?: number;
}

export interface ReportLocation {
  latitude: number;
  longitude: number;
  address: string;
  source: "gps" | "search" | "manual";
}

export type TriageType = "emergency" | "dispatch" | "negative" | "unavailable";

export interface TriageAssessment {
  type: TriageType;
  /** 판정 근거 요약 (1~2줄, 비단정 표현) */
  summary: string;
  analyzedAt?: string;
  isHumanReviewed: boolean;
}

export type ProcessingStatus =
  | "submitted"
  | "triaged"
  | "reviewing"
  | "transferred"
  | "dispatched"
  | "protected"
  | "returned"
  | "negative_closed"
  | "closed";

export type ProcessStepStatus = "completed" | "current" | "upcoming";

export interface ProcessStep {
  id: string;
  label: string;
  status: ProcessStepStatus;
  timestamp?: string;
}

/** 시민 공개 상태 확인 화면에 노출되는 데이터. 정확한 좌표는 포함하지 않는다. */
export interface PublicReport {
  reportId: string;
  submittedAt: string;
  updatedAt: string;
  triage: TriageAssessment;
  processingStatus: ProcessingStatus;
  timeline: ProcessStep[];
  publicLocationLabel: string;
  publicLocationRadiusMeters?: number;
  /** 응급 자동신고가 실행된 건인지 여부 */
  emergencyReported?: boolean;
}
