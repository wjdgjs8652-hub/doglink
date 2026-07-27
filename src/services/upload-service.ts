import { delay } from "./mock-config";
import { isSupabaseConfigured, sbUpload } from "./supabase-client";

/**
 * 사진 업로드 서비스 adapter.
 * 실제 업로드 API가 연결되면 process()의 업로드 단계만 교체한다.
 */

export const MAX_PHOTOS = 3;
export const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const MAX_DIMENSION = 1600;

export interface ProcessedPhoto {
  /** EXIF(위치 정보 포함) 제거 및 리사이즈된 이미지 data URL */
  dataUrl: string;
}

export class PhotoValidationError extends Error {}

export function validatePhotoFile(file: File): void {
  const isImage =
    ACCEPTED_TYPES.includes(file.type) || file.type.startsWith("image/");
  if (!isImage) {
    throw new PhotoValidationError(
      "사진 파일만 올릴 수 있어요. JPG, PNG 형식을 사용해 주세요.",
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new PhotoValidationError(
      "사진이 너무 커요. 15MB 이하의 사진을 선택해 주세요.",
    );
  }
}

/**
 * 이미지 리사이즈 + 재인코딩.
 * canvas 재인코딩 과정에서 EXIF(GPS 포함)가 제거되고,
 * createImageBitmap의 imageOrientation 옵션으로 회전 정보를 보정한다.
 */
export async function compressPhoto(file: File): Promise<ProcessedPhoto> {
  validatePhotoFile(file);

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new PhotoValidationError(
      "사진을 읽지 못했어요. 다른 사진을 선택해 주세요.",
    );
  }

  const scale = Math.min(
    1,
    MAX_DIMENSION / Math.max(bitmap.width, bitmap.height),
  );
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new PhotoValidationError("이 브라우저에서는 사진 처리를 지원하지 않아요.");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return { dataUrl: canvas.toDataURL("image/jpeg", 0.82) };
}

/**
 * 사진 업로드.
 * - Supabase 설정 시: Storage 버킷(report-photos)에 실제 업로드
 * - 미설정 시: mock 진행률 시뮬레이션
 * (EXIF는 compressPhoto의 canvas 재인코딩 단계에서 이미 제거됨)
 */
export async function uploadPhoto(
  dataUrl: string,
  onProgress: (percent: number) => void,
): Promise<{ remoteUrl: string }> {
  if (isSupabaseConfigured) {
    onProgress(15);
    const blob = await (await fetch(dataUrl)).blob();
    onProgress(40);
    const path = `reports/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}.jpg`;
    try {
      const { publicUrl } = await sbUpload("report-photos", path, blob, "image/jpeg");
      onProgress(100);
      return { remoteUrl: publicUrl };
    } catch {
      throw new Error("사진 업로드에 실패했어요. 다시 시도해 주세요.");
    }
  }

  for (const p of [15, 40, 70, 90, 100]) {
    await delay(120 + Math.random() * 180);
    onProgress(p);
  }
  return { remoteUrl: `mock://uploads/${Math.random().toString(36).slice(2)}` };
}
