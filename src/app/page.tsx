"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  UploadCloud, FileText, Play, Pause, Square, Loader2,
  AlertTriangle, Settings, Maximize2, Minimize2, Eye, RefreshCw,
  SkipBack, SkipForward, MousePointer2, PenTool, Highlighter,
  StickyNote, Trash2, Type
} from "lucide-react";

import { ContentBlock, HistoryFile, API_BASE, LANG_NAMES, Annotation, AnnotationTool, ANNOTATION_COLORS, DEFAULT_TOOL_COLORS, TocEntry } from "@/types";
import { AnnotationOverlay } from "@/components/AnnotationOverlay";
import { NavigationSidebar } from "@/components/NavigationSidebar";
import { SettingsDrawer } from "@/components/SettingsDrawer";
import { PlayerControls } from "@/components/PlayerControls";
import { BionicText } from "@/components/BionicText";
import { TopBar } from "@/components/TopBar";
import { UploadScreen } from "@/components/UploadScreen";
import { useHistory } from "@/hooks/useHistory";
import { useTTS } from "@/hooks/useTTS";

export default function Home() {
  /* ── PDF state ── */
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [toc, setToc] = useState<TocEntry[]>([]);
  const [documentName, setDocumentName] = useState("");
  const [serverFilename, setServerFilename] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);

  /* ── UI state ── */
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<"history" | "toc">("history");
  const [showSettings, setShowSettings] = useState(false);
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);

  /* ── Hooks ── */
  const history = useHistory();
  const tts = useTTS();

  /* ── Player state ── */
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const isPlayingRef = useRef(isPlaying);
  const currentBlockIndexRef = useRef(currentBlockIndex);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { currentBlockIndexRef.current = currentBlockIndex; }, [currentBlockIndex]);

  /* ── UI mode state ── */
  const [wideMode, setWideMode] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showPdf, setShowPdf] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedLangFilter, setSelectedLangFilter] = useState("es");
  const [readerMode, setReaderMode] = useState(false);
  const [bionicReading, setBionicReading] = useState(false);

  /* ── Annotations state ── */
  const [currentTool, setCurrentTool] = useState<AnnotationTool>("select");
  const [annotationColor, setAnnotationColor] = useState(DEFAULT_TOOL_COLORS.draw);
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [strokeOpacity, setStrokeOpacity] = useState(0.9);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isSavingAnnotations, setIsSavingAnnotations] = useState(false);
  const [isAnnotationsLoaded, setIsAnnotationsLoaded] = useState(false);

  /* ── Word selection state (for text_highlight tool) ── */
  const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(new Set());
  const isSelecting = useRef(false);
  const selectionRange = useRef<{ start: number; end: number } | null>(null);
  const selectedWordsRef = useRef<Set<string>>(new Set());

  const commitWordHighlights = useCallback((selected: Set<string>) => {
    if (selected.size === 0) return;
    const newAnns: Annotation[] = [];

    const blockGroups: Record<number, number[]> = {};
    for (const wordId of selected) {
      const [bkIdx, wIdx] = wordId.split("-").map(Number);
      if (!blockGroups[bkIdx]) blockGroups[bkIdx] = [];
      blockGroups[bkIdx].push(wIdx);
    }

    for (const [bkIdxStr, wordIndices] of Object.entries(blockGroups)) {
      const bkIdx = parseInt(bkIdxStr);
      const block = blocks[bkIdx];
      if (!block || !block.words || !block.page_width || !block.page_height) continue;

      const lines: Record<string, number[]> = {};
      for (const wIdx of wordIndices) {
        const word: any = block.words![wIdx];
        if (!word) continue;
        const yKey = Math.round(word.bbox[1] * 10) / 10;
        if (!lines[yKey]) lines[yKey] = [];
        lines[yKey].push(wIdx);
      }

      for (const yKey in lines) {
        const lineWords = lines[yKey].sort((a, b) => block.words![a].bbox[0] - block.words![b].bbox[0]);
        let currentSegment: number[] = [];
        for (let i = 0; i < lineWords.length; i++) {
          const wIdx = lineWords[i];
          const word = block.words[wIdx];
          if (currentSegment.length === 0) {
            currentSegment.push(wIdx);
          } else {
            const prevWord = block.words![currentSegment[currentSegment.length - 1]];
            if (word.bbox[0] <= prevWord.bbox[2] + 2) {
              currentSegment.push(wIdx);
            } else {
              newAnns.push(createMergedAnnotation(block, currentSegment));
              currentSegment = [wIdx];
            }
          }
        }
        if (currentSegment.length > 0) {
          newAnns.push(createMergedAnnotation(block, currentSegment));
        }
      }
    }

    function createMergedAnnotation(block: ContentBlock, indices: number[]): Annotation {
      const first = block.words![indices[0]];
      const last = block.words![indices[indices.length - 1]];
      const x0 = first.bbox[0];
      const y0 = first.bbox[1];
      const x1 = last.bbox[2];
      const y1 = last.bbox[3];
      const path = [
        { x: (x0 / block.page_width!) * 100, y: (y0 / block.page_height!) * 100 },
        { x: (x1 / block.page_width!) * 100, y: (y0 / block.page_height!) * 100 },
        { x: (x1 / block.page_width!) * 100, y: (y1 / block.page_height!) * 100 },
        { x: (x0 / block.page_width!) * 100, y: (y1 / block.page_height!) * 100 },
        { x: (x0 / block.page_width!) * 100, y: (y0 / block.page_height!) * 100 },
      ];
      return {
        id: Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
        page: block.page,
        type: "highlight" as AnnotationTool,
        color: annotationColor,
        data: { path, fill: true, opacity: strokeOpacity },
      };
    }
    if (newAnns.length > 0) {
      setAnnotations((prev) => [...prev, ...newAnns]);
    }
  }, [blocks, annotationColor, strokeOpacity]);

  useEffect(() => {
    const handleUp = () => {
      if (isSelecting.current) {
        commitWordHighlights(selectedWordsRef.current);
        selectedWordsRef.current = new Set();
        setSelectedWordIds(new Set());
      }
      isSelecting.current = false;
      selectionRange.current = null;
    };
    window.addEventListener("pointerup", handleUp);
    return () => window.removeEventListener("pointerup", handleUp);
  }, [commitWordHighlights]);

  const handleWordPointerDown = useCallback((flatIndex: number, wordId: string, e: React.PointerEvent) => {
    if (currentTool !== "text_highlight") return;
    e.preventDefault();
    isSelecting.current = true;
    selectionRange.current = { start: flatIndex, end: flatIndex };
    const set = new Set<string>([wordId]);
    selectedWordsRef.current = set;
    setSelectedWordIds(set);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [currentTool]);

  const handleWordPointerEnter = useCallback((flatIndex: number, wordId: string, allWords: {id: string}[]) => {
    if (!isSelecting.current || currentTool !== "text_highlight" || !selectionRange.current) return;
    
    const start = Math.min(selectionRange.current.start, flatIndex);
    const end = Math.max(selectionRange.current.start, flatIndex);
    
    const newSelection = new Set<string>();
    for (let i = start; i <= end; i++) {
      if (allWords[i]) newSelection.add(allWords[i].id);
    }
    
    selectionRange.current = { ...selectionRange.current, end: flatIndex };
    selectedWordsRef.current = newSelection;
    setSelectedWordIds(newSelection);
  }, [currentTool]);

  // Fetch annotations when serverFilename changes

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
  const handleHighlightBlock = useCallback((block: ContentBlock) => {
    if (!block.bbox || !block.page_width || !block.page_height) return;
    const [x0, y0, x1, y1] = block.bbox;
    const path = [
      { x: (x0 / block.page_width) * 100, y: (y0 / block.page_height) * 100 },
      { x: (x1 / block.page_width) * 100, y: (y0 / block.page_height) * 100 },
      { x: (x1 / block.page_width) * 100, y: (y1 / block.page_height) * 100 },
      { x: (x0 / block.page_width) * 100, y: (y1 / block.page_height) * 100 },
      { x: (x0 / block.page_width) * 100, y: (y0 / block.page_height) * 100 },
    ];
    const id = Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    setAnnotations((prev) => [...prev, {
      id,
      page: block.page,
      type: "highlight",
      color: annotationColor,
      data: { path, width: strokeWidth, opacity: strokeOpacity },
    }]);
  }, [annotationColor, strokeWidth, strokeOpacity]);

  /* ── Upload & History logic ── */
  const filterBlocks = (data: { content: ContentBlock[], toc?: TocEntry[] }) => {
    const originalBlocks = data.content;
    const filteredBlocks: ContentBlock[] = [];
    const indexMap = new Map<number, number>();

    for (let i = 0; i < originalBlocks.length; i++) {
      const b = originalBlocks[i];
      if (["p", "h1", "h2", "h3"].includes(b.type) && b.content.trim().length > 5) {
        indexMap.set(i, filteredBlocks.length);
        filteredBlocks.push(b);
      }
    }

    if (data.toc) {
      data.toc.forEach((entry) => {
        if (entry.block_index !== undefined) {
          if (indexMap.has(entry.block_index)) {
            entry.block_index = indexMap.get(entry.block_index);
          } else {
            let nextIdx = entry.block_index;
            while (nextIdx < originalBlocks.length && !indexMap.has(nextIdx)) {
              nextIdx++;
            }
            entry.block_index = indexMap.get(nextIdx);
          }
        }
      });
    }

    return filteredBlocks;
  };

  const processFile = async (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith(".pdf") && !selectedFile.name.toLowerCase().endsWith(".epub")) {
      setError("Solo se admiten archivos PDF o EPUB.");
      return;
    }
    setLoading(true);
    setError("");
    setDocumentName(selectedFile.name.replace(/\.(pdf|epub)$/i, ""));
    // Revoke previous object URL to prevent memory leak
    if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl);
    setPdfObjectUrl(URL.createObjectURL(selectedFile));

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        setBlocks(filterBlocks(data));
        setToc(data.toc || []);
        setActiveSidebarTab(data.toc?.length ? "toc" : "history");
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

  const loadFromHistory = async (file: HistoryFile) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/history/${file.filename}`);
      const data = await res.json();
      if (data.success) {
        setBlocks(filterBlocks(data));
        setToc(data.toc || []);
        setActiveSidebarTab(data.toc?.length ? "toc" : "history");
        setDocumentName(file.original_name.replace(/\.(pdf|epub)$/i, ""));
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
  const fetchAudio = useCallback(async function fetchAudioInner(index: number) {
    if (index >= blocks.length || index < 0) return;
    setCurrentBlockIndex(index);
    setIsPlaying(true);
    const text = blocks[index].content;

    document.getElementById(`block-${index}`)?.scrollIntoView({ behavior: "smooth", block: "center" });

    await tts.speak(text, () => {
      // Auto-advance
      if (index < blocks.length - 1) fetchAudioInner(index + 1);
      else {
        setIsPlaying(false);
        tts.stop();
      }
    });

    // Prefetch the next block's audio while this one is playing
    if (index < blocks.length - 1) {
      tts.prefetch(blocks[index + 1].content);
    }
  }, [blocks, tts]);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      tts.pause();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      if (tts.audioRef.current?.hasAttribute("src") && !tts.audioRef.current.ended) {
        tts.resume();
      } else {
        fetchAudio(currentBlockIndex);
      }
    }
  }, [isPlaying, tts, fetchAudio, currentBlockIndex]);

  const stopPlayback = useCallback(() => {
    tts.stop();
    setIsPlaying(false);
    setCurrentBlockIndex(0);
  }, [tts]);

  const handleNextBlock = useCallback(() => {
    tts.stop();
    if (currentBlockIndex < blocks.length - 1) fetchAudio(currentBlockIndex + 1);
  }, [currentBlockIndex, blocks.length, fetchAudio, tts]);

  const handlePrevBlock = useCallback(() => {
    tts.stop();
    if (currentBlockIndex > 0) fetchAudio(currentBlockIndex - 1);
  }, [currentBlockIndex, fetchAudio, tts]);

  /* ── Keyboard Shortcuts ── */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === "Space") {
        e.preventDefault();
        togglePlayPause();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        handleNextBlock();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        handlePrevBlock();
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlayPause, handleNextBlock, handlePrevBlock]);

  const goToBlock = (index: number) => {
    tts.stop();
    fetchAudio(index);
  };

  /* ── Auto-play on settings change ── */
  const prevVoiceRef = useRef(tts.selectedVoice);
  const prevRateRef = useRef(tts.speechRate);
  
  useEffect(() => {
    if (prevVoiceRef.current !== tts.selectedVoice || prevRateRef.current !== tts.speechRate) {
      prevVoiceRef.current = tts.selectedVoice;
      prevRateRef.current = tts.speechRate;
      
      if (isPlayingRef.current) {
        tts.stop();
        fetchAudio(currentBlockIndexRef.current);
      } else {
        tts.speak("Hola, esta es una prueba de la configuración seleccionada.");
      }
    }
  }, [tts.selectedVoice, tts.speechRate, tts, fetchAudio]);

  /* ── Render ── */
  const pageNumbers = Array.from(new Set(blocks.map((b) => b.page).filter((p) => p !== undefined))) as number[];

  return (
    <div className="min-h-screen bg-[#09090b] text-foreground flex overflow-hidden">
      
      {/* ── HISTORY SIDEBAR ── */}
      <NavigationSidebar
        showHistory={showHistory}
        setShowHistory={setShowHistory}
        activeSidebarTab={activeSidebarTab}
        setActiveSidebarTab={setActiveSidebarTab}
        historyFiles={history.historyFiles}
        fetchHistory={history.fetchHistory}
        loadFromHistory={loadFromHistory}
        toc={toc}
        goToBlock={goToBlock}
      />

      {/* ── SETTINGS DRAWER ── */}
      <SettingsDrawer
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        tts={tts}
        selectedLangFilter={selectedLangFilter}
        setSelectedLangFilter={setSelectedLangFilter}
        wideMode={wideMode}
        setWideMode={setWideMode}
        readerMode={readerMode}
        setReaderMode={setReaderMode}
        bionicReading={bionicReading}
        setBionicReading={setBionicReading}
      />

      {/* ── MAIN CONTENT ── */}
      <main className={`flex-1 flex flex-col h-screen transition-all duration-300 ease-in-out ${fullscreen ? "ml-0" : showHistory ? "ml-80" : "ml-6"}`}>
        
        {/* Top Bar */}
        <TopBar
          fullscreen={fullscreen}
          setFullscreen={setFullscreen}
          showSettings={showSettings}
          setShowSettings={setShowSettings}
          blocksLength={blocks.length}
          documentName={documentName}
          totalPages={totalPages}
          annotations={annotations}
          onNewFile={() => {
            setBlocks([]); setDocumentName(""); setServerFilename(null); stopPlayback(); setError("");
          }}
        />

        {error && (
          <div className="m-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400">
            <AlertTriangle className="w-5 h-5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* ── CONTENT AREA ── */}
        {blocks.length === 0 ? (
          <UploadScreen
            loading={loading}
            isDragging={isDragging}
            setIsDragging={setIsDragging}
            processFile={processFile}
          />
        ) : (
          <>
            {!readerMode && (
              <div className={`shrink-0 px-4 md:px-8 pt-4 md:pt-8 ${wideMode ? "max-w-full" : "max-w-4xl"} mx-auto w-full ${fullscreen ? "hidden" : ""}`}>
              <div className="flex items-center justify-between p-2 rounded-2xl bg-zinc-900/80 backdrop-blur-xl border border-white/10 shadow-lg z-40 relative">
                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentTool("select")} className={`p-2.5 rounded-xl transition-all cursor-pointer ${currentTool === "select" ? "bg-primary text-white shadow-md" : "text-muted-foreground hover:bg-white/10 hover:text-foreground"}`}>
                    <MousePointer2 className="w-5 h-5" />
                  </button>
                  <div className="w-px h-6 bg-white/10 mx-1" />
                  <button onClick={() => { setCurrentTool("draw"); setAnnotationColor(DEFAULT_TOOL_COLORS.draw); setStrokeWidth(2); setStrokeOpacity(0.9); }} className={`p-2.5 rounded-xl transition-all cursor-pointer ${currentTool === "draw" ? "bg-accent text-white shadow-md" : "text-muted-foreground hover:bg-white/10 hover:text-foreground"}`}>
                    <PenTool className="w-5 h-5" />
                  </button>
                  <button onClick={() => { setCurrentTool("highlight"); setAnnotationColor(DEFAULT_TOOL_COLORS.highlight); setStrokeWidth(6); setStrokeOpacity(0.3); }} className={`p-2.5 rounded-xl transition-all cursor-pointer ${currentTool === "highlight" ? "bg-yellow-500 text-white shadow-md" : "text-muted-foreground hover:bg-white/10 hover:text-foreground"}`}>
                    <Highlighter className="w-5 h-5" />
                  </button>
                  <button onClick={() => { setCurrentTool("note"); setAnnotationColor(DEFAULT_TOOL_COLORS.note); }} className={`p-2.5 rounded-xl transition-all cursor-pointer ${currentTool === "note" ? "bg-blue-500 text-white shadow-md" : "text-muted-foreground hover:bg-white/10 hover:text-foreground"}`}>
                    <StickyNote className="w-5 h-5" />
                  </button>
                  <div className="w-px h-6 bg-white/10 mx-1" />
                  <button onClick={() => setCurrentTool("eraser")} className={`p-2.5 rounded-xl transition-all cursor-pointer ${currentTool === "eraser" ? "bg-red-500 text-white shadow-md" : "text-muted-foreground hover:bg-white/10 hover:text-foreground"}`}>
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <div className="w-px h-6 bg-white/10 mx-1" />
                  <button onClick={() => { setCurrentTool("text_highlight"); setAnnotationColor(DEFAULT_TOOL_COLORS.highlight); setStrokeWidth(6); setStrokeOpacity(0.3); }} className={`p-2.5 rounded-xl transition-all cursor-pointer ${currentTool === "text_highlight" ? "bg-yellow-500 text-white shadow-md" : "text-muted-foreground hover:bg-white/10 hover:text-foreground"}`}>
                    <Type className="w-5 h-5" />
                  </button>
                </div>
                {(currentTool === "draw" || currentTool === "highlight" || currentTool === "text_highlight") && (
                  <div className="flex items-center gap-2 px-2 py-1.5 mx-1 rounded-xl bg-white/[0.03] border border-white/5">
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

                <div className="flex items-center gap-3 pr-2">
                  {isSavingAnnotations && (
                    <span className="text-xs text-muted-foreground animate-pulse flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" /> Guardando...
                    </span>
                  )}
                  <button onClick={() => setShowPdf(!showPdf)} className={`p-2 rounded-xl transition-all cursor-pointer ${showPdf ? "bg-white/10 text-foreground" : "text-muted-foreground hover:bg-white/10 hover:text-foreground"}`} title="Ver PDF">
                    <FileText className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-white/5 px-3 py-1.5 rounded-lg">
                    <Eye className="w-4 h-4" />
                    <span>{annotations.length} anotaciones</span>
                  </div>
                </div>
              </div>
            </div>
            )}

            <div className={`flex-1 overflow-y-auto px-4 md:px-8 pb-32 animate-fade-in transition-all duration-500 ease-in-out scroll-smooth ${wideMode ? "max-w-full" : "max-w-4xl"} mx-auto w-full`}>
              {readerMode ? (
                <div className="space-y-6 pt-12 pb-24 text-lg leading-relaxed text-foreground/90 font-serif">
                  {blocks.map((block, globalIndex) => {
                    const isCurrent = currentBlockIndex === globalIndex;
                    const isHeading = ["h1", "h2", "h3"].includes(block.type);
                    
                    return (
                      <p
                        key={globalIndex}
                        id={`block-${globalIndex}`}
                        onClick={() => goToBlock(globalIndex)}
                        className={`cursor-pointer p-4 rounded-2xl transition-all duration-300 ${
                          isCurrent ? "bg-primary/20 ring-1 ring-primary shadow-lg scale-[1.01]" : "hover:bg-white/[0.04]"
                        } ${isHeading ? "font-bold text-2xl text-white mt-8 mb-4 font-sans" : ""}`}
                      >
                        {bionicReading ? <BionicText text={block.content} /> : block.content}
                      </p>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-6 pt-8 relative">
                {pageNumbers.map((pageInfo) => {
                const pageBlocks = blocks.filter((b) => b.page === pageInfo);
                const isCurrentPage = pageBlocks.some((b) => blocks.indexOf(b) === currentBlockIndex);
                const firstBlock = pageBlocks[0];
                const pageWidth = firstBlock?.page_width || 800;
                const pageHeight = firstBlock?.page_height || 1100;

                return (
                  <div key={`page-${pageInfo}`} className={`relative rounded-3xl overflow-hidden transition-all duration-500 ${isCurrentPage ? "ring-1 ring-white/10 shadow-2xl" : ""}`}>

                    {/* PDF image as main view */}
                    <div className="relative w-full bg-white" style={{ aspectRatio: `${pageWidth}/${pageHeight}` }}>
                      {serverFilename && (
                        <img
                          src={`${API_BASE}/page-image/${serverFilename}/${pageInfo}`}
                          alt={`Página ${pageInfo}`}
                          className="absolute inset-0 w-full h-full object-contain"
                          draggable={false}
                        />
                      )}

                    {/* Invisible clickable areas positioned via bbox */}
                    <div className="absolute inset-0 z-10">
                      {currentTool === "text_highlight"
                        ? (() => {
                            const allWordsOnPage = pageBlocks.flatMap((block) => {
                              const globalIndex = blocks.indexOf(block);
                              const words = block.words || [];
                              return words.map((word, wIdx) => ({
                                id: `${globalIndex}-${wIdx}`,
                                bbox: word.bbox || [0, 0, 0, 0],
                                text: word.text || "",
                                page_width: block.page_width || 800,
                                page_height: block.page_height || 1100,
                              }));
                            });

                            return allWordsOnPage.map((word, flatIndex) => {
                              const [x0, y0, x1, y1] = word.bbox;
                              const left = (x0 / word.page_width) * 100;
                              const top = (y0 / word.page_height) * 100;
                              const width = ((x1 - x0) / word.page_width) * 100;
                              const height = ((y1 - y0) / word.page_height) * 100;
                              const isSelected = selectedWordIds.has(word.id);
                              return (
                                <div
                                  key={word.id}
                                  data-word-id={word.id}
                                  onPointerDown={(e) => handleWordPointerDown(flatIndex, word.id, e)}
                                  onPointerEnter={() => handleWordPointerEnter(flatIndex, word.id, allWordsOnPage)}
                                  className={`absolute cursor-pointer transition-colors duration-150 ${isSelected ? "bg-yellow-400/30" : "hover:bg-white/[0.06]"}`}
                                  style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
                                  title={word.text}
                                />
                              );
                            });
                          })()
                        : pageBlocks.map((block) => {
                            const globalIndex = blocks.indexOf(block);
                            const isCurrent = currentBlockIndex === globalIndex;

                            if (block.bbox && block.page_width && block.page_height) {
                              const left = (block.bbox[0] / block.page_width) * 100;
                              const top = (block.bbox[1] / block.page_height) * 100;
                              const width = ((block.bbox[2] - block.bbox[0]) / block.page_width) * 100;
                              const height = ((block.bbox[3] - block.bbox[1]) / block.page_height) * 100;

                              return (
                                <div
                                  key={globalIndex}
                                  id={`block-${globalIndex}`}
                                  onClick={() => goToBlock(globalIndex)}
                                  className={`absolute cursor-pointer transition-colors duration-200 ${isCurrent ? "bg-primary/10 ring-1 ring-primary" : "hover:bg-white/[0.06]"}`}
                                  style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
                                  title={block.content}
                                />
                              );
                            }

                            return (
                              <div
                                key={globalIndex}
                                id={`block-${globalIndex}`}
                                onClick={() => goToBlock(globalIndex)}
                                className={`cursor-pointer p-2 rounded transition-colors ${isCurrent ? "bg-primary/10" : "hover:bg-white/[0.06]"}`}
                              >
                                <p className="text-xs text-transparent">{block.content}</p>
                              </div>
                            );
                          })
                      }
                    </div>

                      <AnnotationOverlay
                        pageNum={pageInfo}
                        currentTool={currentTool}
                        annotationColor={annotationColor}
                        strokeWidth={strokeWidth}
                        strokeOpacity={strokeOpacity}
                        annotations={annotations}
                        onAddAnnotation={handleAddAnnotation}
                        onUpdateAnnotation={handleUpdateAnnotation}
                        onDeleteAnnotation={handleDeleteAnnotation}
                      />
                    </div>

                    <div className="absolute -left-3 top-8 flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-[10px] font-bold ring-4 ring-[#09090b] z-20">
                      {pageInfo}
                    </div>
                  </div>
                );
              })}
              </div>
            )}
            </div>
          </>
        )}

        {/* ── PLAYER CONTROLS (normal) ── */}
        <PlayerControls
          blocksLength={blocks.length}
          currentBlockIndex={currentBlockIndex}
          isPlaying={isPlaying}
          isAudioLoading={tts.isAudioLoading}
          togglePlayPause={togglePlayPause}
          stopPlayback={stopPlayback}
          handleNextBlock={handleNextBlock}
          handlePrevBlock={handlePrevBlock}
          fullscreen={fullscreen}
        />

        {/* ── FULLSCREEN FLOATING CONTROLS ── */}
        {blocks.length > 0 && fullscreen && (
          <>
            {/* Top bar - exit fullscreen + page info */}
            <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
              <div className="flex items-center gap-2 text-xs text-white/80 pointer-events-auto">
                <span className="bg-white/10 px-2 py-1 rounded-md">{documentName}</span>
                <span className="bg-white/10 px-2 py-1 rounded-md">{totalPages} págs</span>
              </div>
              <div className="flex items-center gap-2 pointer-events-auto">
                <span className="text-xs text-white/60 bg-black/40 px-2 py-1 rounded-md">
                  Bloque {currentBlockIndex + 1}/{blocks.length}
                </span>
                <button
                  onClick={() => setFullscreen(false)}
                  className="p-2 rounded-xl bg-black/40 hover:bg-white/20 transition-all cursor-pointer text-white"
                  title="Salir de pantalla completa"
                >
                  <Minimize2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Left - annotation tools */}
            <div className="fixed left-3 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2">
              <div className="flex flex-col gap-1 p-1.5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10">
                <button onClick={() => setCurrentTool("select")} className={`p-2.5 rounded-xl transition-all cursor-pointer ${currentTool === "select" ? "bg-primary text-white shadow-md" : "text-white/70 hover:bg-white/20 hover:text-white"}`}>
                  <MousePointer2 className="w-5 h-5" />
                </button>
                <button onClick={() => { setCurrentTool("draw"); setAnnotationColor(DEFAULT_TOOL_COLORS.draw); }} className={`p-2.5 rounded-xl transition-all cursor-pointer ${currentTool === "draw" ? "bg-accent text-white shadow-md" : "text-white/70 hover:bg-white/20 hover:text-white"}`}>
                  <PenTool className="w-5 h-5" />
                </button>
                <button onClick={() => { setCurrentTool("highlight"); setAnnotationColor(DEFAULT_TOOL_COLORS.highlight); }} className={`p-2.5 rounded-xl transition-all cursor-pointer ${currentTool === "highlight" ? "bg-yellow-500 text-white shadow-md" : "text-white/70 hover:bg-white/20 hover:text-white"}`}>
                  <Highlighter className="w-5 h-5" />
                </button>
                <button onClick={() => { setCurrentTool("note"); setAnnotationColor(DEFAULT_TOOL_COLORS.note); }} className={`p-2.5 rounded-xl transition-all cursor-pointer ${currentTool === "note" ? "bg-blue-500 text-white shadow-md" : "text-white/70 hover:bg-white/20 hover:text-white"}`}>
                  <StickyNote className="w-5 h-5" />
                </button>
                <button onClick={() => setCurrentTool("eraser")} className={`p-2.5 rounded-xl transition-all cursor-pointer ${currentTool === "eraser" ? "bg-red-500 text-white shadow-md" : "text-white/70 hover:bg-white/20 hover:text-white"}`}>
                  <Trash2 className="w-5 h-5" />
                </button>
                <button onClick={() => { setCurrentTool("text_highlight"); setAnnotationColor(DEFAULT_TOOL_COLORS.highlight); setStrokeWidth(6); setStrokeOpacity(0.3); }} className={`p-2.5 rounded-xl transition-all cursor-pointer ${currentTool === "text_highlight" ? "bg-yellow-500 text-white shadow-md" : "text-white/70 hover:bg-white/20 hover:text-white"}`}>
                  <Type className="w-5 h-5" />
                </button>
              </div>
              {(currentTool === "draw" || currentTool === "highlight" || currentTool === "text_highlight") && (
                <div className="flex flex-col gap-1.5 p-1.5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 items-center">
                  <div className="flex flex-wrap gap-1 justify-center max-w-[52px]">
                    {ANNOTATION_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setAnnotationColor(c)}
                        className={`w-3.5 h-3.5 rounded-full transition-all cursor-pointer ${annotationColor === c ? "ring-2 ring-white ring-offset-1 ring-offset-black scale-125" : "hover:scale-110"}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="w-full h-px bg-white/10" />
                  <div className="flex flex-wrap gap-1 justify-center max-w-[52px]">
                    {[1, 2, 4, 6, 8].map((w) => (
                      <button
                        key={w}
                        onClick={() => setStrokeWidth(w)}
                        className={`text-[9px] font-medium w-5 h-5 rounded-md transition-all cursor-pointer ${strokeWidth === w ? "bg-primary/20 text-primary" : "text-white/50 hover:bg-white/20 hover:text-white"}`}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                  <div className="w-full h-px bg-white/10" />
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] text-white/40">Op</span>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.1"
                      value={strokeOpacity}
                      onChange={(e) => setStrokeOpacity(parseFloat(e.target.value))}
                      className="w-10 h-1 accent-primary cursor-pointer"
                    />
                    <span className="text-[8px] text-white/50 w-3">{Math.round(strokeOpacity * 100)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Right - audio controls */}
            <div className="fixed right-3 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2">
              <div className="flex flex-col gap-1 p-1.5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10">
                <button onClick={handlePrevBlock} disabled={currentBlockIndex === 0} className="p-2.5 rounded-xl text-white/70 hover:bg-white/20 hover:text-white disabled:opacity-30 transition-all cursor-pointer"><SkipBack className="w-5 h-5" /></button>
                <button onClick={togglePlayPause} className="p-3 rounded-xl bg-primary text-white hover:bg-primary/90 transition-all cursor-pointer">
                  {tts.isAudioLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>
                <button onClick={stopPlayback} disabled={!isPlaying && currentBlockIndex === 0 && !tts.isAudioLoading} className="p-2.5 rounded-xl text-white/70 hover:bg-white/20 hover:text-white disabled:opacity-30 transition-all cursor-pointer"><Square className="w-5 h-5" /></button>
                <button onClick={handleNextBlock} disabled={currentBlockIndex === blocks.length - 1} className="p-2.5 rounded-xl text-white/70 hover:bg-white/20 hover:text-white disabled:opacity-30 transition-all cursor-pointer"><SkipForward className="w-5 h-5" /></button>
              </div>
            </div>

            {/* Bottom - annotation count */}
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
              <div className="flex items-center gap-2 text-xs text-white/60 bg-black/40 backdrop-blur-xl px-3 py-1.5 rounded-full border border-white/10">
                <Eye className="w-3.5 h-3.5" />
                <span>{annotations.length} anotaciones</span>
              </div>
            </div>
          </>
        )}

        <audio ref={tts.audioRef} className="hidden" />
      </main>
    </div>
  );
}
