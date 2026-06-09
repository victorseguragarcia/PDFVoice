"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  UploadCloud, FileText, Play, Pause, Square, Loader2, Volume2,
  FastForward, Rewind, History, X, ChevronLeft, ChevronRight, AlertTriangle,
  Settings, Maximize2, Minimize2, Eye, Languages, RefreshCw,
  ChevronDown, Search, Check, Sparkles, SkipBack, SkipForward,
  MousePointer2, PenTool, Highlighter, StickyNote, Save, Trash2
} from "lucide-react";

import { ContentBlock, HistoryFile, API_BASE, LANG_NAMES, Annotation, AnnotationTool } from "@/types";
import { AnnotationOverlay } from "@/components/AnnotationOverlay";
import { useHistory } from "@/hooks/useHistory";
import { useTTS } from "@/hooks/useTTS";

export default function Home() {
  /* ── PDF state ── */
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [documentName, setDocumentName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const [serverFilename, setServerFilename] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);

  /* ── Hooks ── */
  const history = useHistory();
  const tts = useTTS();

  /* ── Player state ── */
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  /* ── UI state ── */
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [wideMode, setWideMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  /* ── Annotations state ── */
  const [currentTool, setCurrentTool] = useState<AnnotationTool>("select");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isSavingAnnotations, setIsSavingAnnotations] = useState(false);
  const [isAnnotationsLoaded, setIsAnnotationsLoaded] = useState(false);

  // Fetch annotations when serverFilename changes
  useEffect(() => {
    if (serverFilename) {
      setIsAnnotationsLoaded(false);
      fetch(`${API_BASE}/annotations/${serverFilename}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.annotations) {
            setAnnotations(data.annotations);
          }
        })
        .catch((err) => console.error("Error loading annotations:", err))
        .finally(() => setIsAnnotationsLoaded(true));
    } else {
      setAnnotations([]);
      setIsAnnotationsLoaded(false);
    }
  }, [serverFilename]);

  // Auto-save annotations
  useEffect(() => {
    if (isAnnotationsLoaded && serverFilename) {
      const saveTimer = setTimeout(() => {
        setIsSavingAnnotations(true);
        fetch(`${API_BASE}/annotations/${serverFilename}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ annotations }),
        })
          .catch((err) => console.error(err))
          .finally(() => setIsSavingAnnotations(false));
      }, 1000);
      return () => clearTimeout(saveTimer);
    }
  }, [annotations, isAnnotationsLoaded, serverFilename]);

  const handleAddAnnotation = useCallback((ann: Annotation) => setAnnotations((prev) => [...prev, ann]), []);
  const handleUpdateAnnotation = useCallback((id: string, text: string) => {
    setAnnotations((prev) => prev.map((a) => (a.id === id ? { ...a, data: { ...a.data, text } } : a)));
  }, []);
  const handleDeleteAnnotation = useCallback((id: string) => setAnnotations((prev) => prev.filter((a) => a.id !== id)), []);
  const handleClearPageAnnotations = () => {
    const page = blocks[currentBlockIndex]?.page || 1;
    setAnnotations((prev) => prev.filter((a) => a.page !== page));
  };

  /* ── Upload & History logic ── */
  const filterBlocks = (data: { content: ContentBlock[] }) =>
    data.content.filter((b) => ["p", "h1", "h2", "h3"].includes(b.type) && b.content.trim().length > 5);

  const processFile = async (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith(".pdf")) {
      setError("Solo se admiten archivos PDF.");
      return;
    }
    setLoading(true);
    setError("");
    setDocumentName(selectedFile.name.replace(/\.pdf$/i, ""));
    setPdfObjectUrl(URL.createObjectURL(selectedFile));

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        setBlocks(filterBlocks(data));
        setServerFilename(data.metadata.filename);
        setTotalPages(data.metadata.total_pages);
        setCurrentBlockIndex(0);
        history.fetchHistory();
      } else setError(data.error || "Error al procesar el archivo");
    } catch {
      setError("Error de conexión con el servidor local.");
    } finally {
      setLoading(false);
    }
  };

  const loadFromHistory = async (file: any) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/history/${file.filename}`);
      const data = await res.json();
      if (data.success) {
        setBlocks(filterBlocks(data));
        setDocumentName(file.original_name.replace(/\.pdf$/i, ""));
        setServerFilename(file.filename);
        setTotalPages(data.metadata.total_pages);
        setCurrentBlockIndex(0);
      }
    } catch {
      setError("Error cargando historial");
    } finally {
      setLoading(false);
      setShowHistory(false);
    }
  };

  /* ── Player logic ── */
  const fetchAudio = useCallback(async (index: number) => {
    if (index >= blocks.length || index < 0) return;
    setCurrentBlockIndex(index);
    const text = blocks[index].content;

    document.getElementById(`block-${index}`)?.scrollIntoView({ behavior: "smooth", block: "center" });

    await tts.speak(text, () => {
      // Auto-advance
      if (index < blocks.length - 1) fetchAudio(index + 1);
      else setIsPlaying(false);
    });
  }, [blocks, tts]);

  const togglePlayPause = () => {
    if (isPlaying) {
      tts.pause();
      setIsPlaying(false);
    } else {
      if (tts.audioRef.current?.src) {
        tts.resume();
      } else {
        fetchAudio(currentBlockIndex);
      }
      setIsPlaying(true);
    }
  };

  const stopPlayback = () => {
    tts.stop();
    setIsPlaying(false);
    setCurrentBlockIndex(0);
  };

  const handleNextBlock = useCallback(() => {
    tts.stop();
    if (currentBlockIndex < blocks.length - 1) fetchAudio(currentBlockIndex + 1);
  }, [currentBlockIndex, blocks.length, fetchAudio, tts]);

  const handlePrevBlock = () => {
    tts.stop();
    if (currentBlockIndex > 0) fetchAudio(currentBlockIndex - 1);
  };

  const goToBlock = (index: number) => {
    tts.stop();
    setIsPlaying(true);
    fetchAudio(index);
  };

  /* ── Render ── */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pageNumbers = Array.from(new Set(blocks.map((b) => b.page).filter((p) => p !== undefined))) as number[];

  return (
    <div className="min-h-screen bg-[#09090b] text-foreground flex overflow-hidden">
      
      {/* ── HISTORY SIDEBAR ── */}
      <div
        className={`fixed top-0 left-0 h-full z-50 flex transition-transform duration-300 ease-in-out ${
          showHistory ? "translate-x-0" : "-translate-x-[calc(100%-1.5rem)]"
        }`}
        onMouseEnter={() => {
          setShowHistory(true);
          history.fetchHistory();
        }}
        onMouseLeave={() => setShowHistory(false)}
      >
        <aside className="w-80 h-full bg-zinc-900/95 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col shadow-2xl relative">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Historial
            </h2>
            <History className="w-5 h-5 text-muted-foreground" />
          </div>
          {history.historyFiles.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 opacity-40">
              <History className="w-14 h-14" />
              <p className="text-center text-sm leading-relaxed">
                Aún no has subido<br />ningún documento.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {history.historyFiles.map((file) => (
                <button
                  key={file.filename}
                  onClick={() => loadFromHistory(file)}
                  className="w-full text-left p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-primary/15 hover:border-primary/40 transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
                    <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                      {file.original_name}
                    </h4>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-2 ml-8">
                    <span>
                      {new Date(file.created_at * 1000).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    <span>{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        <div className="w-6 h-full flex items-center justify-center cursor-pointer group bg-gradient-to-r from-black/10 to-transparent">
          <div
            className={`w-1 h-16 rounded-full transition-all duration-300 ${
              showHistory ? "bg-primary" : "bg-white/20 group-hover:bg-primary/60 group-hover:scale-y-150"
            }`}
          />
        </div>
      </div>

      {/* ── SETTINGS DRAWER ── */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          <aside className="animate-slide-in-right relative w-full max-w-md h-full bg-zinc-900/95 backdrop-blur-xl border-l border-white/10 p-6 flex flex-col shadow-2xl overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Ajustes de voz
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="mb-8">
              <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">
                Voz (Silero TTS Local)
              </label>
              <div className="space-y-2">
                {tts.voices.length === 0 && (
                  <div className="text-sm text-muted-foreground">Cargando voces...</div>
                )}
                {tts.voices.map((v) => {
                  const isSelected = tts.selectedVoice === v.short_name;
                  const isFemale = v.gender === "Female";
                  return (
                    <button
                      key={v.short_name}
                      onClick={() => tts.setSelectedVoice(v.short_name)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-200 text-left cursor-pointer group relative overflow-hidden ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-[0_0_12px_rgba(139,92,246,0.15)] text-foreground"
                          : "border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold transition-all ${
                            isSelected
                              ? isFemale ? "bg-pink-500/20 text-pink-400" : "bg-cyan-500/20 text-cyan-400"
                              : isFemale ? "bg-white/[0.04] text-pink-400/70 group-hover:bg-pink-500/10 group-hover:text-pink-400" : "bg-white/[0.04] text-cyan-400/70 group-hover:bg-cyan-500/10 group-hover:text-cyan-400"
                          }`}
                        >
                          {isFemale ? "♀" : "♂"}
                        </div>
                        <div>
                          <span className="font-semibold text-sm transition-colors group-hover:text-foreground block">
                            {v.friendly_name}
                          </span>
                          <span className="text-[10px] text-muted-foreground/60">{v.short_name}</span>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-8 opacity-50 pointer-events-none" title="No soportado por Silero TTS actualmente">
              <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 flex justify-between">
                <span>Velocidad</span>
                <span className="text-foreground">{tts.speechRate >= 0 ? "+" : ""}{tts.speechRate}%</span>
              </label>
              <input type="range" min="-50" max="100" step="10" value={tts.speechRate} onChange={(e) => tts.setSpeechRate(parseInt(e.target.value))} className="w-full accent-primary cursor-pointer" />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>Lenta</span><span>Normal</span><span>Rápida</span>
              </div>
            </div>

            <div className="mb-6">
              <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 block">Interfaz</label>
              <button
                onClick={() => setWideMode(!wideMode)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
                  wideMode ? "border-primary/50 bg-primary/15" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                }`}
              >
                <div className="flex items-center gap-3">
                  {wideMode ? <Minimize2 className="w-5 h-5 text-primary" /> : <Maximize2 className="w-5 h-5 text-muted-foreground" />}
                  <span className="text-sm font-medium">Modo ancho</span>
                </div>
                <div className={`w-10 h-6 rounded-full transition-colors flex items-center ${wideMode ? "bg-primary justify-end" : "bg-white/20 justify-start"}`}>
                  <div className="w-4 h-4 rounded-full bg-white mx-1 shadow" />
                </div>
              </button>
            </div>

            <button
              onClick={() => tts.speak("Hola, esta es una prueba de la voz seleccionada usando el modelo local.")}
              disabled={tts.isAudioLoading}
              className="w-full mt-auto py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-medium hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer disabled:opacity-50"
            >
              {tts.isAudioLoading ? "Generando audio..." : "Probar voz seleccionada"}
            </button>
          </aside>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <main className={`flex-1 flex flex-col h-screen transition-all duration-300 ease-in-out ${showHistory ? "ml-80" : "ml-6"}`}>
        
        {/* Top Bar */}
        <header className="h-20 border-b border-white/5 bg-zinc-950/50 backdrop-blur-md flex flex-col justify-center px-8 relative z-20 shrink-0">
          <div className="flex justify-between items-center max-w-7xl mx-auto w-full">
            <div className="flex flex-col">
              <h1 className="text-xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                PDFVoice <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium ml-2">Silero AI</span>
              </h1>
              {documentName && (
                <div className="flex items-center gap-2 mt-1.5 animate-fade-in">
                  <span className="text-sm font-medium text-muted-foreground/80 flex items-center gap-1.5">{documentName}</span>
                  <span className="text-xs text-muted-foreground/50 px-2 py-0.5 bg-white/5 rounded-md">{totalPages} págs</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setBlocks([]); setDocumentName(""); setServerFilename(null); stopPlayback(); setError("");
                }}
                className={`p-2.5 rounded-xl border border-white/10 hover:bg-white/[0.08] transition-all flex items-center gap-2 ${blocks.length === 0 ? "hidden" : "animate-fade-in"}`}
              >
                <RefreshCw className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Nuevo</span>
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] hover:border-white/20 transition-all text-muted-foreground hover:text-foreground relative group cursor-pointer"
                title="Ajustes de Voz"
              >
                <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
              </button>
            </div>
          </div>
        </header>

        {error && (
          <div className="m-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400">
            <AlertTriangle className="w-5 h-5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* ── CONTENT AREA ── */}
        {blocks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center animate-fade-in w-full py-16">
            <div className="text-center mb-12">
              <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">
                PDF a <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Voz</span>
              </h1>
              <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                Convierte tus documentos en audio al instante utilizando la IA local de Silero TTS. Completamente privado y sin internet.
              </p>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
              onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
              onDrop={(e) => {
                e.preventDefault(); e.stopPropagation(); setIsDragging(false);
                if (e.dataTransfer.files?.length > 0) processFile(e.dataTransfer.files[0]);
              }}
              onClick={() => !loading && fileInputRef.current?.click()}
              className={`w-full max-w-2xl aspect-video rounded-3xl border-2 border-dashed flex flex-col items-center justify-center transition-all duration-300 cursor-pointer overflow-hidden relative group
                ${isDragging ? "border-primary bg-primary/10 scale-[1.02]" : "border-white/20 bg-white/[0.02] hover:border-primary/50 hover:bg-white/[0.04]"}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              {loading ? (
                <div className="flex flex-col items-center gap-4 text-primary animate-pulse relative z-10">
                  <Loader2 className="w-16 h-16 animate-spin" />
                  <p className="text-lg font-medium">Procesando y extrayendo texto...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-6 relative z-10">
                  <div className={`p-6 rounded-full transition-colors ${isDragging ? "bg-primary text-white" : "bg-white/5 text-muted-foreground"}`}>
                    <UploadCloud className="w-12 h-12" />
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-medium mb-2">Haz clic o arrastra tu PDF aquí</p>
                    <p className="text-sm text-muted-foreground/80">Soporta PDFs con múltiples páginas</p>
                  </div>
                </div>
              )}
              <input type="file" accept=".pdf" className="hidden" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} disabled={loading} />
            </div>
          </div>
        ) : (
          <div className={`flex-1 overflow-y-auto p-4 md:p-8 animate-fade-in transition-all duration-500 ease-in-out scroll-smooth ${wideMode ? "max-w-full" : "max-w-4xl"} mx-auto w-full relative`}>
            
            <div className="sticky top-0 z-30 mb-8 flex items-center justify-between p-2 rounded-2xl bg-zinc-900/80 backdrop-blur-xl border border-white/10 shadow-lg">
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentTool("select")} className={`p-2.5 rounded-xl transition-all cursor-pointer ${currentTool === "select" ? "bg-primary text-white shadow-md" : "text-muted-foreground hover:bg-white/10 hover:text-foreground"}`}>
                  <MousePointer2 className="w-5 h-5" />
                </button>
                <div className="w-px h-6 bg-white/10 mx-1" />
                <button onClick={() => setCurrentTool("draw")} className={`p-2.5 rounded-xl transition-all cursor-pointer ${currentTool === "draw" ? "bg-accent text-white shadow-md" : "text-muted-foreground hover:bg-white/10 hover:text-foreground"}`}>
                  <PenTool className="w-5 h-5" />
                </button>
                <button onClick={() => setCurrentTool("highlight")} className={`p-2.5 rounded-xl transition-all cursor-pointer ${currentTool === "highlight" ? "bg-yellow-500 text-white shadow-md" : "text-muted-foreground hover:bg-white/10 hover:text-foreground"}`}>
                  <Highlighter className="w-5 h-5" />
                </button>
                <button onClick={() => setCurrentTool("note")} className={`p-2.5 rounded-xl transition-all cursor-pointer ${currentTool === "note" ? "bg-blue-500 text-white shadow-md" : "text-muted-foreground hover:bg-white/10 hover:text-foreground"}`}>
                  <StickyNote className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-3 pr-2">
                {isSavingAnnotations && (
                  <span className="text-xs text-muted-foreground animate-pulse flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" /> Guardando...
                  </span>
                )}
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-white/5 px-3 py-1.5 rounded-lg">
                  <Eye className="w-4 h-4" />
                  <span>{annotations.length} anotaciones</span>
                </div>
                <button onClick={handleClearPageAnnotations} className="p-2 rounded-lg text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors cursor-pointer" title="Borrar anotaciones de esta página">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-6 pb-32 relative">
              {pageNumbers.map((pageInfo) => {
                const pageBlocks = blocks.filter((b) => b.page === pageInfo);
                const isCurrentPage = pageBlocks.some((b) => blocks.indexOf(b) === currentBlockIndex);

                return (
                  <div key={`page-${pageInfo}`} className={`relative p-8 rounded-3xl transition-all duration-500 ${isCurrentPage ? "bg-white/[0.03] ring-1 ring-white/10 shadow-2xl" : "hover:bg-white/[0.01]"}`}>
                    <AnnotationOverlay
                      pageNum={pageInfo}
                      currentTool={currentTool}
                      annotations={annotations}
                      onAddAnnotation={handleAddAnnotation}
                      onUpdateAnnotation={handleUpdateAnnotation}
                      onDeleteAnnotation={handleDeleteAnnotation}
                    />

                    <div className="absolute -left-3 top-8 flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-[10px] font-bold ring-4 ring-[#09090b]">
                      {pageInfo}
                    </div>

                    {pageBlocks.map((block) => {
                      const globalIndex = blocks.indexOf(block);
                      const isCurrent = currentBlockIndex === globalIndex;
                      const isPast = globalIndex < currentBlockIndex;

                      let textClass = "text-base md:text-lg leading-relaxed text-foreground";
                      if (block.type === "h1") textClass = "text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-4 mt-8";
                      else if (block.type === "h2") textClass = "text-2xl md:text-3xl font-bold text-foreground mb-3 mt-6";
                      else if (block.type === "h3") textClass = "text-xl md:text-2xl font-semibold text-foreground/90 mb-2 mt-4";

                      return (
                        <div key={globalIndex} id={`block-${globalIndex}`} onClick={() => goToBlock(globalIndex)} className={`relative p-5 rounded-2xl cursor-pointer transition-all duration-300 group ${isCurrent ? "bg-primary/10 border-l-4 border-primary shadow-lg scale-[1.01]" : "border-l-4 border-transparent hover:bg-white/[0.04]"}`}>
                          {isCurrent && <div className="absolute top-1/2 -left-2 w-1.5 h-6 bg-primary rounded-full -translate-y-1/2 animate-pulse shadow-[0_0_10px_rgba(139,92,246,0.5)]" />}
                          <p className={`${textClass} ${isPast && !isCurrent ? "text-muted-foreground" : ""} ${isCurrent ? "font-medium" : ""}`}>
                            {block.content}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── PLAYER CONTROLS ── */}
        {blocks.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-2xl bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-[0_20px_40px_rgba(0,0,0,0.4)] animate-slide-up">
            <div className="flex items-center gap-4">
              <div className="absolute top-0 left-0 right-0 h-1 bg-white/5 rounded-t-2xl overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 ease-out" style={{ width: `${((currentBlockIndex + 1) / blocks.length) * 100}%` }} />
              </div>

              <div className="flex-1 flex flex-col justify-center">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 px-1 font-medium">
                  <span className="flex items-center gap-1.5"><Volume2 className="w-3.5 h-3.5" /> Lectura en curso</span>
                  <span className="bg-white/10 px-2 py-0.5 rounded-full text-[10px]">Bloque {currentBlockIndex + 1} / {blocks.length}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={handlePrevBlock} disabled={currentBlockIndex === 0} className="p-2 rounded-xl hover:bg-white/10 disabled:opacity-30 transition-all cursor-pointer hover:scale-105 active:scale-95"><SkipBack className="w-5 h-5" /></button>
                <button onClick={togglePlayPause} className="p-3.5 rounded-xl bg-primary text-white hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all cursor-pointer hover:scale-105 active:scale-95">
                  {tts.isAudioLoading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                </button>
                <button onClick={stopPlayback} disabled={!isPlaying && currentBlockIndex === 0 && !tts.isAudioLoading} className="p-2 rounded-xl hover:bg-white/10 disabled:opacity-30 transition-all cursor-pointer hover:scale-105 active:scale-95"><Square className="w-5 h-5" /></button>
                <button onClick={handleNextBlock} disabled={currentBlockIndex === blocks.length - 1} className="p-2 rounded-xl hover:bg-white/10 disabled:opacity-30 transition-all cursor-pointer hover:scale-105 active:scale-95"><SkipForward className="w-5 h-5" /></button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
