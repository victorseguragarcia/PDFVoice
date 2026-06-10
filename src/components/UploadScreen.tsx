import React, { useRef } from "react";
import { UploadCloud, Loader2 } from "lucide-react";

interface UploadScreenProps {
  loading: boolean;
  isDragging: boolean;
  setIsDragging: (val: boolean) => void;
  processFile: (file: File) => Promise<void>;
}

export const UploadScreen: React.FC<UploadScreenProps> = ({
  loading,
  isDragging,
  setIsDragging,
  processFile
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[60%] rounded-full bg-accent/5 blur-[100px]" />
      </div>

      <div className="text-center mb-12 relative z-10 animate-fade-in">
        <h2 className="text-4xl md:text-6xl font-bold bg-gradient-to-br from-white to-white/50 bg-clip-text text-transparent tracking-tight mb-4">
          Tu lectura, <br className="hidden md:block" /><span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">sin barreras</span>
        </h2>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Sube tus documentos, PDFs o libros (EPUB) y escúchalos con voces neuronales ultra realistas o procésalos con lectura biónica.
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
              <p className="text-xl font-medium mb-2">Haz clic o arrastra tu PDF o EPUB aquí</p>
              <p className="text-sm text-muted-foreground/80">Soporta documentos con múltiples páginas</p>
            </div>
          </div>
        )}
        <input type="file" accept=".pdf,.epub" className="hidden" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} disabled={loading} />
      </div>
    </div>
  );
};
