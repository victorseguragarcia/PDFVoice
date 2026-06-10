import React, { useState, useRef } from "react";
import { Annotation, AnnotationTool } from "@/types";

const generateId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

interface AnnotationOverlayProps {
  pageNum: number;
  currentTool: AnnotationTool;
  annotationColor: string;
  strokeWidth: number;
  strokeOpacity: number;
  annotations: Annotation[];
  onAddAnnotation: (ann: Annotation) => void;
  onUpdateAnnotation: (id: string, text: string) => void;
  onDeleteAnnotation: (id: string) => void;
}

export function AnnotationOverlay({
  pageNum,
  currentTool,
  annotationColor,
  strokeWidth,
  strokeOpacity,
  annotations,
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation
}: AnnotationOverlayProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const getCoords = (e: React.PointerEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (currentTool === "select") return;

    if ((e.target as HTMLElement).tagName.toLowerCase() === "textarea" || (e.target as HTMLElement).tagName.toLowerCase() === "button") {
      return;
    }

    if (currentTool === "eraser") {
      const target = e.target as HTMLElement;
      const annId = target.dataset?.annotationId;
      if (annId) {
        onDeleteAnnotation(annId);
      }
      return;
    }

    e.preventDefault();
    const { x, y } = getCoords(e);

    if (currentTool === "note") {
      onAddAnnotation({
        id: generateId(),
        page: pageNum,
        type: "note",
        color: annotationColor,
        data: { x, y, text: "" },
      });
      return;
    }

    setIsDrawing(true);
    setCurrentPath([{ x, y }]);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || currentTool === "select" || currentTool === "note" || currentTool === "eraser") return;
    e.preventDefault();
    const { x, y } = getCoords(e);
    setCurrentPath((prev) => [...prev, { x, y }]);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    setIsDrawing(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    if (currentPath.length > 1) {
      onAddAnnotation({
        id: generateId(),
        page: pageNum,
        type: currentTool as "draw" | "highlight",
        color: annotationColor,
        data: { path: currentPath, width: strokeWidth, opacity: strokeOpacity },
      });
    }
    setCurrentPath([]);
  };

  const pageAnnotations = annotations.filter((a) => a.page === pageNum);

  const renderPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return "";
    const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    return d;
  };

  const isInteractive = currentTool !== "select" && currentTool !== "text_highlight";

  const parseColor = (color: string, opacity: number) => {
    if (color.startsWith("#")) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${opacity})`;
    }
    return color;
  };

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 z-30 touch-none ${isInteractive ? "" : "pointer-events-none"}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ pointerEvents: isInteractive ? "auto" : "none" }}
    >
      <svg className={`absolute inset-0 w-full h-full ${currentTool === "eraser" ? "" : "pointer-events-none"}`} viewBox="0 0 100 100" preserveAspectRatio="none">
        {pageAnnotations.map((ann) => {
          if (ann.type === "draw" || ann.type === "highlight") {
            const isHighlight = ann.type === "highlight";
            const color = ann.color || (isHighlight ? "#eab308" : "#8b5cf6");
            const w = ann.data?.width || (isHighlight ? 6 : 2);
            const op = ann.data?.opacity ?? (isHighlight ? 0.3 : 0.9);
            const isFilled = ann.data?.fill === true;
            return (
              <path
                key={ann.id}
                data-annotation-id={ann.id}
                d={renderPath(ann.data.path)}
                fill={isFilled ? parseColor(color, op) : "none"}
                stroke={isFilled ? "none" : parseColor(color, op)}
                strokeWidth={isFilled ? 0 : w}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={currentTool === "eraser" ? "cursor-pointer hover:opacity-50" : ""}
                style={{ pointerEvents: currentTool === "eraser" ? "auto" : "none" }}
              />
            );
          }
          return null;
        })}
        
        {isDrawing && currentPath.length > 0 && (
          <path
            d={renderPath(currentPath)}
            fill="none"
            stroke={parseColor(annotationColor, strokeOpacity)}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>

      {pageAnnotations.map((ann) => {
        if (ann.type === "note") {
          const noteColor = ann.color || "#3b82f6";
          return (
            <div
              key={ann.id}
              className={`absolute shadow-2xl z-40 animate-fade-in ${currentTool === "eraser" ? "cursor-pointer" : ""}`}
              data-annotation-id={ann.id}
              onClick={currentTool === "eraser" ? () => onDeleteAnnotation(ann.id) : undefined}
              style={{
                left: `${ann.data.x}%`,
                top: `${ann.data.y}%`,
                transform: "translate(-50%, -50%)"
              }}
            >
              <div className="relative group">
                <textarea
                  className="w-48 h-24 p-2 text-xs rounded shadow-inner resize-none focus:outline-none focus:ring-2 placeholder:text-white/50"
                  style={{ backgroundColor: `${noteColor}dd`, borderColor: noteColor, color: "#fff" }}
                  placeholder="Escribe una nota..."
                  value={ann.data.text}
                  onChange={(e) => onUpdateAnnotation(ann.id, e.target.value)}
                  onPointerDown={(e) => e.stopPropagation()}
                />
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteAnnotation(ann.id); }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
                  title="Borrar nota"
                >
                  ×
                </button>
              </div>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
