/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_KAKAO_MAP_KEY?: string;
  readonly VITE_NAVER_MAP_CLIENT_ID?: string;
  readonly VITE_KAKAO_SHARE_KEY?: string;
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
