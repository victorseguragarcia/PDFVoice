import React from "react";
import { History, FileText, List } from "lucide-react";
import { HistoryFile, TocEntry } from "@/types";

interface NavigationSidebarProps {
  showHistory: boolean;
  setShowHistory: (show: boolean) => void;
  activeSidebarTab: "history" | "toc";
  setActiveSidebarTab: (tab: "history" | "toc") => void;
  historyFiles: HistoryFile[];
  fetchHistory: () => void;
  loadFromHistory: (file: HistoryFile) => void;
  toc: TocEntry[];
  goToBlock: (index: number) => void;
}

export const NavigationSidebar: React.FC<NavigationSidebarProps> = ({
  showHistory,
  setShowHistory,
  activeSidebarTab,
  setActiveSidebarTab,
  historyFiles,
  fetchHistory,
  loadFromHistory,
  toc,
  goToBlock,
}) => {
  return (
    <div
      className={`fixed top-0 left-0 h-full z-50 flex transition-transform duration-300 ease-in-out ${
        showHistory ? "translate-x-0" : "-translate-x-[calc(100%-1.5rem)]"
      }`}
      onMouseEnter={() => {
        setShowHistory(true);
        fetchHistory();
      }}
      onMouseLeave={() => setShowHistory(false)}
    >
      <aside className="w-80 h-full bg-zinc-900/95 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col shadow-2xl relative">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Navegación
          </h2>
        </div>

        <div className="flex p-1 bg-white/5 rounded-xl mb-6">
          <button 
            onClick={() => setActiveSidebarTab("history")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeSidebarTab === "history" ? "bg-white/10 text-white shadow-sm" : "text-muted-foreground hover:text-white hover:bg-white/5"}`}
          >
            Archivos
          </button>
          <button 
            onClick={() => setActiveSidebarTab("toc")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeSidebarTab === "toc" ? "bg-white/10 text-white shadow-sm" : "text-muted-foreground hover:text-white hover:bg-white/5"}`}
          >
            Índice
          </button>
        </div>

        {activeSidebarTab === "history" ? (
          historyFiles.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 opacity-40">
              <History className="w-14 h-14" />
              <p className="text-center text-sm leading-relaxed">
                Aún no has subido<br />ningún documento.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {historyFiles.map((file) => (
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
          )
        ) : (
          toc.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 opacity-40">
              <List className="w-14 h-14" />
              <p className="text-center text-sm leading-relaxed">
                Este documento no<br />tiene un índice nativo.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {toc.map((entry, idx) => (
                <button
                  key={idx}
                  onClick={() => entry.block_index !== undefined && goToBlock(entry.block_index)}
                  className={`w-full text-left py-2 px-3 rounded-lg hover:bg-primary/15 transition-all group cursor-pointer flex gap-3 ${entry.level === 1 ? 'mt-2 font-bold text-primary/90' : entry.level === 2 ? 'ml-3 text-sm text-foreground/80' : 'ml-6 text-xs text-muted-foreground'}`}
                >
                  <span className="flex-1 line-clamp-2">{entry.title}</span>
                  {entry.page && <span className="text-[10px] opacity-40 pt-1 shrink-0">p.{entry.page}</span>}
                </button>
              ))}
            </div>
          )
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
  );
};
