"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { API_BASE } from "@/types";

export interface Voice {
  short_name: string;
  friendly_name: string;
  locale: string;
  language: string;
  gender: string;
}

export function useTTS() {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState("es_1");
  const [speechRate, setSpeechRate] = useState(0); 
  const [pitch, setPitch] = useState(0); 

  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [ttsError, setTtsError] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchVoices = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/voices`);
      const data = await res.json();
      if (data.success) {
        setVoices(data.voices);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchVoices();
  }, [fetchVoices]);

  const speak = useCallback(
    async (text: string, onEnd?: () => void) => {
      setIsAudioLoading(true);
      setTtsError("");

      try {
        const rateStr = speechRate >= 0 ? `+${speechRate}%` : `${speechRate}%`;
        const pitchStr = pitch >= 0 ? `+${pitch}Hz` : `${pitch}Hz`;

        const res = await fetch(`${API_BASE}/synthesize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            voice: selectedVoice,
            rate: rateStr,
            pitch: pitchStr,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          const msg = errData?.error || "No se pudo generar el audio.";
          setTtsError(msg);
          return;
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);

        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.onended = () => onEnd?.();
          await audioRef.current.play();
        }
      } catch (err) {
        console.error("Error synthesizing audio:", err);
        setTtsError("Error de conexión con el servidor local.");
      } finally {
        setIsAudioLoading(false);
      }
    },
    [selectedVoice, speechRate, pitch]
  );

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    audioRef.current?.play();
  }, []);

  return {
    voices,
    selectedVoice,
    setSelectedVoice,
    speechRate,
    setSpeechRate,
    pitch,
    setPitch,
    ttsError,
    setTtsError,
    isAudioLoading,
    audioRef,
    speak,
    stop,
    pause,
    resume,
  };
}
