import React from "react";
import { X, Minimize2, Maximize2, BookOpen, Zap } from "lucide-react";

interface SettingsDrawerProps {
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  tts: any; // We'll type this dynamically using the hook's return
  selectedLangFilter: string;
  setSelectedLangFilter: (lang: string) => void;
  wideMode: boolean;
  setWideMode: (wide: boolean) => void;
  readerMode: boolean;
  setReaderMode: (mode: boolean) => void;
  bionicReading: boolean;
  setBionicReading: (mode: boolean) => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  showSettings,
  setShowSettings,
  tts,
  selectedLangFilter,
  setSelectedLangFilter,
  wideMode,
  setWideMode,
  readerMode,
  setReaderMode,
  bionicReading,
  setBionicReading,
}) => {
  if (!showSettings) return null;

  return (
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
            Voz (Microsoft Edge TTS)
          </label>
          <div className="space-y-4">
            {tts.voices.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {Array.from(new Set(tts.voices.map((v: any) => v.language || "otro"))).map((lang: any) => (
                  <button
                    key={lang as string}
                    onClick={() => setSelectedLangFilter(lang as string)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                      selectedLangFilter === lang
                        ? "bg-primary/20 text-primary border border-primary/50"
                        : "bg-white/5 text-muted-foreground hover:bg-white/10 border border-transparent"
                    }`}
                  >
                    {lang === "es" ? "Español" : lang === "en" ? "English" : lang === "fr" ? "Français" : lang === "de" ? "Deutsch" : lang}
                  </button>
                ))}
              </div>
            )}

            {tts.voices.length === 0 && (
              <div className="text-sm text-muted-foreground">Cargando voces...</div>
            )}
            
            <div className="space-y-1.5">
              {tts.voices
                .filter((v: any) => (v.language || "otro") === selectedLangFilter)
                .map((v: any) => {
                  const isSelected = tts.selectedVoice === v.short_name;
                  const isFemale = v.gender === "Female";
                  return (
                    <button
                      key={v.short_name}
                      onClick={() => tts.setSelectedVoice(v.short_name)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200 text-left cursor-pointer group relative overflow-hidden ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-[0_0_12px_rgba(139,92,246,0.15)] text-foreground"
                          : "border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold transition-all ${
                            isSelected
                              ? isFemale ? "bg-pink-500/20 text-pink-400" : "bg-cyan-500/20 text-cyan-400"
                              : isFemale ? "bg-white/[0.04] text-pink-400/70 group-hover:bg-pink-500/10 group-hover:text-pink-400" : "bg-white/[0.04] text-cyan-400/70 group-hover:bg-cyan-500/10 group-hover:text-cyan-400"
                          }`}
                        >
                          {isFemale ? "♀" : "♂"}
                        </div>
                        <div>
                          <span className="font-medium text-sm transition-colors group-hover:text-foreground block leading-tight">
                            {v.friendly_name}
                          </span>
                          <span className="text-[10px] text-muted-foreground/60">{v.short_name}</span>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 flex justify-between">
            <span>Velocidad</span>
            <span className="text-foreground">{tts.speechRate >= 0 ? "+" : ""}{tts.speechRate}%</span>
          </label>
          <input type="range" min="-50" max="100" step="10" value={tts.speechRate} onChange={(e) => tts.setSpeechRate(parseInt(e.target.value))} className="w-full accent-primary cursor-pointer" />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>Lenta</span><span>Normal</span><span>Rápida</span>
          </div>
        </div>

        <div className="mb-8">
          <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 flex justify-between">
            <span>Tono (Pitch)</span>
            <span className="text-foreground">{tts.pitch >= 0 ? "+" : ""}{tts.pitch}Hz</span>
          </label>
          <input type="range" min="-50" max="50" step="5" value={tts.pitch} onChange={(e) => tts.setPitch(parseInt(e.target.value))} className="w-full accent-primary cursor-pointer" />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>Grave</span><span>Normal</span><span>Agudo</span>
          </div>
        </div>

        <div className="mb-6 space-y-3">
          <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Interfaz</label>
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

          <button
            onClick={() => setReaderMode(!readerMode)}
            className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
              readerMode ? "border-primary/50 bg-primary/15" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
            }`}
          >
            <div className="flex items-center gap-3">
              <BookOpen className={`w-5 h-5 ${readerMode ? "text-primary" : "text-muted-foreground"}`} />
              <span className="text-sm font-medium">Modo Lector (Texto Plano)</span>
            </div>
            <div className={`w-10 h-6 rounded-full transition-colors flex items-center ${readerMode ? "bg-primary justify-end" : "bg-white/20 justify-start"}`}>
              <div className="w-4 h-4 rounded-full bg-white mx-1 shadow" />
            </div>
          </button>

          {readerMode && (
            <button
              onClick={() => setBionicReading(!bionicReading)}
              className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
                bionicReading ? "border-yellow-500/50 bg-yellow-500/15" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
              }`}
            >
              <div className="flex items-center gap-3">
                <Zap className={`w-5 h-5 ${bionicReading ? "text-yellow-500" : "text-muted-foreground"}`} />
                <span className="text-sm font-medium">Lectura Biónica</span>
              </div>
              <div className={`w-10 h-6 rounded-full transition-colors flex items-center ${bionicReading ? "bg-yellow-500 justify-end" : "bg-white/20 justify-start"}`}>
                <div className="w-4 h-4 rounded-full bg-white mx-1 shadow" />
              </div>
            </button>
          )}
        </div>

        <button
          onClick={() => tts.speak("Hola, esta es una prueba de la voz y velocidad seleccionada.")}
          disabled={tts.isAudioLoading}
          className="w-full mt-auto py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-medium hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer disabled:opacity-50"
        >
          {tts.isAudioLoading ? "Generando audio..." : "Probar voz seleccionada"}
        </button>
      </aside>
    </div>
  );
};
