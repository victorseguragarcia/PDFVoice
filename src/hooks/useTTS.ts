"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { API_BASE, TTSStatus } from "@/types";

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
  const [engineStatus, setEngineStatus] = useState<TTSStatus | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioPoolRef = useRef<HTMLAudioElement[]>([]);
  const generationIdRef = useRef(0);
  const isPlayingRef = useRef(false);

  const urlCacheRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    // Inicializar pool de Audio para reproducción sin pausas
    audioPoolRef.current = [new Audio(), new Audio(), new Audio()];
    return () => {
      audioPoolRef.current.forEach(a => {
        a.pause();
        a.removeAttribute("src");
        a.load();
      });
    };
  }, []);
  const promiseCacheRef = useRef<Map<string, Promise<string>>>(new Map());

  // Clean up cached audio URLs when voice parameters change to prevent memory leaks
  useEffect(() => {
    return () => {
      for (const url of urlCacheRef.current.values()) {
        URL.revokeObjectURL(url);
      }
      urlCacheRef.current.clear();
      promiseCacheRef.current.clear();
    };
  }, [selectedVoice, speechRate, pitch]);

  // Poll TTS status every 5 seconds until ready or error
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    const checkStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/tts-status`);
        const data = await res.json();
        setEngineStatus(data);
        if (data.status === "ready" || data.status === "error") {
          clearInterval(interval);
        }
      } catch (err) {
        // fail silently
      }
    };
    
    checkStatus();
    interval = setInterval(checkStatus, 5000);
    
    return () => clearInterval(interval);
  }, []);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchVoices();
  }, [fetchVoices]);

  const getAudioUrl = useCallback((text: string): Promise<string> => {
    const cacheKey = `${text}-${selectedVoice}-${speechRate}-${pitch}`;

    if (promiseCacheRef.current.has(cacheKey)) {
      return promiseCacheRef.current.get(cacheKey)!;
    }

    const promise = (async () => {
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
        throw new Error(errData?.error || "No se pudo generar el audio.");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      urlCacheRef.current.set(cacheKey, url);

      // Limpiar caché antigua (límite de 15)
      if (urlCacheRef.current.size > 15) {
        const firstKey = urlCacheRef.current.keys().next().value;
        if (firstKey) {
          const oldUrl = urlCacheRef.current.get(firstKey);
          if (oldUrl) URL.revokeObjectURL(oldUrl);
          urlCacheRef.current.delete(firstKey);
          promiseCacheRef.current.delete(firstKey);
        }
      }

      return url;
    })();

    promiseCacheRef.current.set(cacheKey, promise);
    return promise;
  }, [selectedVoice, speechRate, pitch]);

  const prefetch = useCallback((text: string) => {
    getAudioUrl(text).then(url => {
      if (audioPoolRef.current.some(a => a.src === url)) return;
      const idleAudio = audioPoolRef.current.find(a => 
         a !== activeAudioRef.current && (a.paused || a.ended || !a.src)
      ) || audioPoolRef.current[0];
      idleAudio.src = url;
      idleAudio.load();
    }).catch(() => {});
  }, [getAudioUrl]);

  const speak = useCallback(
    async (text: string, onEnd?: () => void) => {
      const currentGen = ++generationIdRef.current;
      isPlayingRef.current = true;
      
      const cacheKey = `${text}-${selectedVoice}-${speechRate}-${pitch}`;
      const isCached = urlCacheRef.current.has(cacheKey);
      
      if (!isCached) {
        setIsAudioLoading(true);
      }
      setTtsError("");

      try {
        const url = await getAudioUrl(text);

        if (currentGen !== generationIdRef.current) {
          return; // Aborted
        }

        if (activeAudioRef.current && activeAudioRef.current.src !== url) {
           activeAudioRef.current.pause();
        }

        let audioToPlay = audioPoolRef.current.find(a => a.src === url);
        if (!audioToPlay) {
           audioToPlay = audioPoolRef.current.find(a => a !== activeAudioRef.current) || audioPoolRef.current[0];
           audioToPlay.src = url;
           audioToPlay.load();
        }

        activeAudioRef.current = audioToPlay;
        try { audioToPlay.currentTime = 0; } catch (e) {}
        audioToPlay.onended = () => onEnd?.();

        if (isPlayingRef.current) {
          try {
            await audioToPlay.play();
          } catch (playErr) {
            if (playErr instanceof Error && playErr.name !== "AbortError") {
              console.error("Error reproduciendo audio:", playErr);
            }
          }
        }
      } catch (err: any) {
        console.error("Error synthesizing audio:", err);
        if (currentGen === generationIdRef.current) {
          setTtsError(err.message || "Error de conexión con el servidor local.");
        }
      } finally {
        if (currentGen === generationIdRef.current) {
          setIsAudioLoading(false);
        }
      }
    },
    [selectedVoice, speechRate, pitch, getAudioUrl]
  );

  const stop = useCallback(() => {
    generationIdRef.current++;
    isPlayingRef.current = false;
    setIsAudioLoading(false);
    audioPoolRef.current.forEach(a => {
      a.pause();
      try { a.currentTime = 0; } catch(e){}
    });
  }, []);

  const pause = useCallback(() => {
    isPlayingRef.current = false;
    activeAudioRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    isPlayingRef.current = true;
    if (activeAudioRef.current && activeAudioRef.current.src) {
      activeAudioRef.current.play().catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Error al reanudar audio:", err);
        }
      });
    }
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
    engineStatus,
    isAudioLoading,
    audioRef: activeAudioRef,
    speak,
    stop,
    pause,
    resume,
    prefetch,
  };
}
