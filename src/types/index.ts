/* ───────── Shared types ───────── */

export interface ContentBlock {
  type: string;
  content: string;
  page: number;
  bbox?: number[];
  page_width?: number;
  page_height?: number;
}

export interface HistoryFile {
  filename: string;
  original_name: string;
  size: number;
  created_at: number;
}

export interface TTSStatus {
  ready: boolean;
  status: "not_initialized" | "loading" | "ready" | "error";
  message: string;
  device?: string;
}

export type VoiceEngine = "ai" | "browser";
export type ViewMode = "reader" | "pdf" | "split";
export type AnnotationTool = "select" | "draw" | "highlight" | "note";

export interface Annotation {
  id: string;
  page: number;
  type: AnnotationTool;
  data: any; // SVG path string, or text note content with coordinates
}

export const API_BASE = typeof window !== "undefined" 
  ? `${window.location.protocol}//${window.location.hostname}:8000/api`
  : "http://localhost:8000/api";

export const LANG_NAMES: Record<string, string> = {
  es: "Español",
  en: "English",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  pt: "Português",
  ja: "日本語",
  ko: "한국어",
  zh: "中文",
  ru: "Русский",
  ar: "العربية",
  hi: "हिन्दी",
  nl: "Nederlands",
  pl: "Polski",
  sv: "Svenska",
  da: "Dansk",
  fi: "Suomi",
  no: "Norsk",
  tr: "Türkçe",
  ca: "Català",
  eu: "Euskara",
  gl: "Galego",
};
