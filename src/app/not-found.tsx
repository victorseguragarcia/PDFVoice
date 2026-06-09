"use client";

import Link from "next/link";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-zinc-950 px-4">
      {/* Background gradients similar to main page */}
      <div 
        className="pointer-events-none fixed inset-0 z-0" 
        style={{
          background: "radial-gradient(ellipse 60% 50% at 50% -10%, rgba(139,92,246,0.12) 0%, transparent 70%), radial-gradient(ellipse 40% 40% at 80% 80%, rgba(45,212,191,0.08) 0%, transparent 70%)",
        }} 
      />

      <div className="z-10 flex flex-col items-center text-center animate-fade-in max-w-lg w-full">
        {/* 404 Icon & Numbers */}
        <div className="relative mb-8 flex justify-center">
          <div className="absolute inset-0 bg-primary/20 blur-[60px] rounded-full" />
          <div className="relative glass-card p-8 rounded-full border border-white/10 shadow-2xl bg-zinc-900/50">
            <FileQuestion className="w-20 h-20 text-accent animate-pulse" />
          </div>
        </div>

        <h1 className="text-7xl font-black mb-4 tracking-tighter">
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            404
          </span>
        </h1>
        
        <h2 className="text-2xl font-bold text-foreground mb-4">
          Página no encontrada
        </h2>
        
        <p className="text-muted-foreground text-lg mb-10 leading-relaxed">
          Parece que te has perdido. El documento o la página que buscas no existe o ha sido movida.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
          <button 
            onClick={() => window.history.back()}
            className="w-full sm:w-auto px-6 py-3 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-foreground font-medium transition-all flex items-center justify-center gap-2 group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground group-hover:-translate-x-1 transition-transform" />
            Volver atrás
          </button>
          
          <Link 
            href="/"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-medium hover:scale-[1.02] active:scale-[0.98] transition-transform flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.3)]"
          >
            <Home className="w-4 h-4" />
            Ir al Inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
