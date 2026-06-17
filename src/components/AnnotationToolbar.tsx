import React from "react";
import { MousePointer2, PenTool, Highlighter, StickyNote, Trash2, Type, FileText, Eye } from "lucide-react";
import { AnnotationTool, ANNOTATION_COLORS, DEFAULT_TOOL_COLORS } from "@/types";

interface AnnotationToolbarProps {
  currentTool: AnnotationTool;
  setCurrentTool: (tool: AnnotationTool) => void;
  annotationColor: string;
  setAnnotationColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  strokeOpacity: number;
  setStrokeOpacity: (opacity: number) => void;
  isSavingAnnotations: boolean;
  showPdf: boolean;
  setShowPdf: (show: boolean) => void;
  annotationsCount: number;
  wideMode: boolean;
  fullscreen: boolean;
}

export const AnnotationToolbar: React.FC<AnnotationToolbarProps> = ({
  currentTool,
  setCurrentTool,
  annotationColor,
  setAnnotationColor,
  strokeWidth,
  setStrokeWidth,
  strokeOpacity,
  setStrokeOpacity,
  isSavingAnnotations,
  showPdf,
  setShowPdf,
  annotationsCount,
  wideMode,
  fullscreen,
}) => {
  if (fullscreen) return null;

  return (
    <div className={`shrink-0 px-4 md:px-8 pt-4 md:pt-8 ${wideMode ? "max-w-full" : "max-w-4xl"} mx-auto w-full`}>
      <div className="flex items-center justify-between p-2 rounded-2xl bg-zinc-900/80 backdrop-blur-xl border border-white/10 shadow-lg z-40 relative">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          <button onClick={() => setCurrentTool("select")} className={`p-2.5 rounded-xl transition-all cursor-pointer ${currentTool === "select" ? "bg-primary text-white shadow-md" : "text-muted-foreground hover:bg-white/10 hover:text-foreground"}`} title="Seleccionar">
            <MousePointer2 className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-white/10 mx-1" />
          <button onClick={() => { setCurrentTool("draw"); setAnnotationColor(DEFAULT_TOOL_COLORS.draw); setStrokeWidth(2); setStrokeOpacity(0.9); }} className={`p-2.5 rounded-xl transition-all cursor-pointer ${currentTool === "draw" ? "bg-accent text-white shadow-md" : "text-muted-foreground hover:bg-white/10 hover:text-foreground"}`} title="Dibujar libremente">
            <PenTool className="w-5 h-5" />
          </button>
          <button onClick={() => { setCurrentTool("highlight"); setAnnotationColor(DEFAULT_TOOL_COLORS.highlight); setStrokeWidth(6); setStrokeOpacity(0.3); }} className={`p-2.5 rounded-xl transition-all cursor-pointer ${currentTool === "highlight" ? "bg-yellow-500 text-white shadow-md" : "text-muted-foreground hover:bg-white/10 hover:text-foreground"}`} title="Subrayar texto (libre)">
            <Highlighter className="w-5 h-5" />
          </button>
          <button onClick={() => { setCurrentTool("note"); setAnnotationColor(DEFAULT_TOOL_COLORS.note); }} className={`p-2.5 rounded-xl transition-all cursor-pointer ${currentTool === "note" ? "bg-blue-500 text-white shadow-md" : "text-muted-foreground hover:bg-white/10 hover:text-foreground"}`} title="Añadir nota de texto">
            <StickyNote className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-white/10 mx-1" />
          <button onClick={() => setCurrentTool("eraser")} className={`p-2.5 rounded-xl transition-all cursor-pointer ${currentTool === "eraser" ? "bg-red-500 text-white shadow-md" : "text-muted-foreground hover:bg-white/10 hover:text-foreground"}`} title="Borrador">
            <Trash2 className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-white/10 mx-1" />
          <button onClick={() => { setCurrentTool("text_highlight"); setAnnotationColor(DEFAULT_TOOL_COLORS.highlight); setStrokeWidth(6); setStrokeOpacity(0.3); }} className={`p-2.5 rounded-xl transition-all cursor-pointer ${currentTool === "text_highlight" ? "bg-yellow-500 text-white shadow-md" : "text-muted-foreground hover:bg-white/10 hover:text-foreground"}`} title="Seleccionar texto inteligente">
            <Type className="w-5 h-5" />
          </button>
        </div>
        
        {(currentTool === "draw" || currentTool === "highlight" || currentTool === "text_highlight") && (
          <div className="hidden md:flex items-center gap-2 px-2 py-1.5 mx-1 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="flex items-center gap-1">
              {ANNOTATION_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setAnnotationColor(c)}
                  className={`w-4 h-4 rounded-full transition-all cursor-pointer ${annotationColor === c ? "ring-2 ring-white ring-offset-1 ring-offset-zinc-900 scale-125" : "hover:scale-110"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="w-px h-5 bg-white/10" />
            <div className="flex items-center gap-1">
              {[
                { label: "1", w: 1 },
                { label: "2", w: 2 },
                { label: "4", w: 4 },
                { label: "6", w: 6 },
                { label: "8", w: 8 },
              ].map(({ label, w }) => (
                <button
                  key={w}
                  onClick={() => setStrokeWidth(w)}
                  className={`px-1.5 py-0.5 text-[10px] font-medium rounded-md transition-all cursor-pointer ${strokeWidth === w ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-white/10 hover:text-foreground"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="w-px h-5 bg-white/10" />
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground/60">Op</span>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={strokeOpacity}
                onChange={(e) => setStrokeOpacity(parseFloat(e.target.value))}
                className="w-16 h-1 accent-primary cursor-pointer"
              />
              <span className="text-[10px] text-muted-foreground/60 w-4">{Math.round(strokeOpacity * 100)}%</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 pr-2 shrink-0">
          {isSavingAnnotations && (
            <span className="text-xs text-muted-foreground animate-pulse hidden sm:flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" /> Guardando...
            </span>
          )}
          <button onClick={() => setShowPdf(!showPdf)} className={`p-2 rounded-xl transition-all cursor-pointer ${showPdf ? "bg-white/10 text-foreground" : "text-muted-foreground hover:bg-white/10 hover:text-foreground"}`} title="Mostrar/Ocultar PDF">
            <FileText className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-white/5 px-3 py-1.5 rounded-lg">
            <Eye className="w-4 h-4" />
            <span>{annotationsCount} notas</span>
          </div>
        </div>
      </div>
    </div>
  );
};
