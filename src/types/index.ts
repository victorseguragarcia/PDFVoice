/* ───────── Shared types ───────── */

export interface WordPosition {
  text: string;
  bbox: number[];
  size: number;
}

export interface ContentBlock {
  type: string;
  content: string;
  page: number;
  bbox?: number[];
  page_width?: number;
  page_height?: number;
  words?: WordPosition[];
}

export interface HistoryFile {
  filename: string;
  original_name: string;
  size: number;
  created_at: number;
}

export interface TocEntry {
  level: number;
  title: string;
  page: number;
  block_index?: number;
}

export interface TTSStatus {
  ready: boolean;
  status: "not_initialized" | "loading" | "ready" | "error";
  message: string;
  device?: string;
}

export type VoiceEngine = "ai" | "browser";
export type ViewMode = "reader" | "pdf" | "split";
export type AnnotationTool = "select" | "draw" | "highlight" | "text_highlight" | "note" | "eraser";

export interface Annotation {
  id: string;
  page: number;
  type: AnnotationTool;
  color?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

export const ANNOTATION_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#2dd4bf",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

export const DEFAULT_TOOL_COLORS: Record<string, string> = {
  draw: "#8b5cf6",
  highlight: "#eab308",
  text_highlight: "#eab308",
  note: "#3b82f6",
};

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
