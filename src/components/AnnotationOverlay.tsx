import React, { useState, useRef } from "react";
import { Annotation, AnnotationTool } from "@/types";

const generateId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

interface AnnotationOverlayProps {
  pageNum: number;
  currentTool: AnnotationTool;
  annotations: Annotation[];
  onAddAnnotation: (ann: Annotation) => void;
  onUpdateAnnotation: (id: string, text: string) => void;
  onDeleteAnnotation: (id: string) => void;
}

export function AnnotationOverlay({
  pageNum,
  currentTool,
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
    
    // Si la herramienta es nota, comprobamos si estamos haciendo clic en un textarea
    if ((e.target as HTMLElement).tagName.toLowerCase() === "textarea" || (e.target as HTMLElement).tagName.toLowerCase() === "button") {
      return;
    }

    e.preventDefault();
    const { x, y } = getCoords(e);

    if (currentTool === "note") {
      onAddAnnotation({
        id: generateId(),
        page: pageNum,
        type: "note",
        data: { x, y, text: "" },
      });
      return;
    }

    setIsDrawing(true);
    setCurrentPath([{ x, y }]);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || currentTool === "select" || currentTool === "note") return;
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
        type: currentTool,
        data: { path: currentPath },
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

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 z-30 touch-none ${currentTool !== "select" ? "cursor-crosshair" : "pointer-events-none"}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ pointerEvents: currentTool !== "select" ? "auto" : "none" }}
    >
      {/* SVG for paths */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
        {pageAnnotations.map((ann) => {
          if (ann.type === "draw" || ann.type === "highlight") {
            const isHighlight = ann.type === "highlight";
            return (
              <path
                key={ann.id}
                d={renderPath(ann.data.path)}
                fill="none"
                stroke={isHighlight ? "rgba(45,212,191,0.4)" : "rgba(139,92,246,0.8)"}
                strokeWidth={isHighlight ? "2.5" : "0.5"}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          }
          return null;
        })}
        
        {/* Active path */}
        {isDrawing && currentPath.length > 0 && (
          <path
            d={renderPath(currentPath)}
            fill="none"
            stroke={currentTool === "highlight" ? "rgba(45,212,191,0.4)" : "rgba(139,92,246,0.8)"}
            strokeWidth={currentTool === "highlight" ? "2.5" : "0.5"}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>

      {/* HTML elements for notes */}
      {pageAnnotations.map((ann) => {
        if (ann.type === "note") {
          return (
            <div
              key={ann.id}
              className="absolute pointer-events-auto shadow-2xl z-40 animate-fade-in"
              style={{
                left: `${ann.data.x}%`,
                top: `${ann.data.y}%`,
                transform: "translate(-50%, -50%)"
              }}
            >
              <div className="relative group">
                <textarea
                  className="w-48 h-24 p-2 text-xs bg-yellow-200/90 text-yellow-900 border border-yellow-400 rounded shadow-inner resize-none focus:outline-none focus:ring-2 focus:ring-yellow-500 placeholder:text-yellow-700/50"
                  placeholder="Escribe una nota..."
                  value={ann.data.text}
                  onChange={(e) => onUpdateAnnotation(ann.id, e.target.value)}
                  onPointerDown={(e) => e.stopPropagation()} // Prevent drawing over textarea
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
