"use client";

import { useState, useCallback, useEffect } from "react";
import { HistoryFile, API_BASE } from "@/types";

export function useHistory() {
  const [historyFiles, setHistoryFiles] = useState<HistoryFile[]>([]);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/history`);
      const data = await res.json();
      if (data.success) setHistoryFiles(data.history);
    } catch {
      /* silently fail */
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchHistory();
  }, [fetchHistory]);

  return { historyFiles, fetchHistory };
}
