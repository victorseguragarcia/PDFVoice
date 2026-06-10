import React from "react";
import { Volume2, SkipBack, Pause, Play, Square, SkipForward } from "lucide-react";

interface PlayerControlsProps {
  blocksLength: number;
  currentBlockIndex: number;
  isPlaying: boolean;
  isAudioLoading: boolean;
  togglePlayPause: () => void;
  stopPlayback: () => void;
  handleNextBlock: () => void;
  handlePrevBlock: () => void;
  fullscreen: boolean;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  blocksLength,
  currentBlockIndex,
  isPlaying,
  isAudioLoading,
  togglePlayPause,
  stopPlayback,
  handleNextBlock,
  handlePrevBlock,
  fullscreen,
}) => {
  if (blocksLength === 0 || fullscreen) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-2xl bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-[0_20px_40px_rgba(0,0,0,0.4)] animate-slide-up">
      <div className="flex items-center gap-4">
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/5 rounded-t-2xl overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 ease-out" style={{ width: `${((currentBlockIndex + 1) / blocksLength) * 100}%` }} />
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 px-1 font-medium">
            <span className="flex items-center gap-1.5"><Volume2 className="w-3.5 h-3.5" /> Lectura en curso</span>
            <span className="bg-white/10 px-2 py-0.5 rounded-full text-[10px]">Bloque {currentBlockIndex + 1} / {blocksLength}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handlePrevBlock} disabled={currentBlockIndex === 0} className="p-2 rounded-xl hover:bg-white/10 disabled:opacity-30 transition-all cursor-pointer hover:scale-105 active:scale-95"><SkipBack className="w-5 h-5" /></button>
          <button onClick={togglePlayPause} className="p-3.5 rounded-xl bg-primary text-white hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all cursor-pointer hover:scale-105 active:scale-95">
            {isAudioLoading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </button>
          <button onClick={stopPlayback} disabled={!isPlaying && currentBlockIndex === 0 && !isAudioLoading} className="p-2 rounded-xl hover:bg-white/10 disabled:opacity-30 transition-all cursor-pointer hover:scale-105 active:scale-95"><Square className="w-5 h-5" /></button>
          <button onClick={handleNextBlock} disabled={currentBlockIndex === blocksLength - 1} className="p-2 rounded-xl hover:bg-white/10 disabled:opacity-30 transition-all cursor-pointer hover:scale-105 active:scale-95"><SkipForward className="w-5 h-5" /></button>
        </div>
      </div>
    </div>
  );
};
