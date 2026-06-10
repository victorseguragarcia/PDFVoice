import React from "react";
import { FileText, RefreshCw, Maximize2, Settings, DownloadCloud } from "lucide-react";
import { Annotation } from "@/types";
import { exportAnnotationsToMarkdown } from "@/utils/export";

interface TopBarProps {
  fullscreen: boolean;
  setFullscreen: (val: boolean) => void;
  showSettings: boolean;
  setShowSettings: (val: boolean) => void;
  blocksLength: number;
  documentName: string;
  totalPages: number;
  annotations: Annotation[];
  onNewFile: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  fullscreen,
  setFullscreen,
  showSettings,
  setShowSettings,
  blocksLength,
  documentName,
  totalPages,
  annotations,
  onNewFile
}) => {
  if (fullscreen) return null;

  return (
    <header className="h-20 border-b border-white/5 bg-zinc-950/50 backdrop-blur-md flex flex-col justify-center px-8 relative z-20 shrink-0">
      <div className="flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            PDFVoice <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium ml-2">Piper TTS</span>
          </h1>
          {documentName && (
            <div className="flex items-center gap-2 mt-1.5 animate-fade-in">
              <span className="text-sm font-medium text-muted-foreground/80 flex items-center gap-1.5">{documentName}</span>
              <span className="text-xs text-muted-foreground/50 px-2 py-0.5 bg-white/5 rounded-md">{totalPages} págs</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {annotations.length > 0 && documentName && (
            <button
              onClick={() => exportAnnotationsToMarkdown(documentName, annotations)}
              className="p-2.5 rounded-xl border border-accent/20 bg-accent/10 hover:bg-accent/20 transition-all flex items-center gap-2 animate-fade-in text-accent cursor-pointer"
              title="Exportar notas (Markdown)"
            >
              <DownloadCloud className="w-4 h-4" />
              <span className="text-sm font-medium">Exportar Notas</span>
            </button>
          )}

          <button
            onClick={onNewFile}
            className={`p-2.5 rounded-xl border border-white/10 hover:bg-white/[0.08] transition-all flex items-center gap-2 cursor-pointer ${blocksLength === 0 ? "hidden" : "animate-fade-in"}`}
            title="Cargar nuevo archivo"
          >
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground hidden sm:inline">Nuevo</span>
          </button>
          
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${fullscreen ? "bg-primary/20 border-primary/40 text-primary" : "bg-white/[0.03] border-white/10 hover:bg-white/[0.08] hover:border-white/20 text-muted-foreground hover:text-foreground"}`}
            title={fullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
          >
            <Maximize2 className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] hover:border-white/20 transition-all text-muted-foreground hover:text-foreground relative group cursor-pointer"
            title="Ajustes"
          >
            <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
          </button>
        </div>
      </div>
    </header>
  );
};
