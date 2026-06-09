"use client";

import { useState, useCallback, useEffect } from "react";
import { HistoryFile, ContentBlock, API_BASE } from "@/types";

function filterBlocks(data: { content: ContentBlock[] }) {
  return data.content.filter(
    (b) =>
      ["p", "h1", "h2", "h3"].includes(b.type) && b.content.trim().length > 5
  );
}

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
    fetchHistory();
  }, [fetchHistory]);

  const loadFromHistory = useCallback(
    async (file: HistoryFile) => {
      try {
        const res = await fetch(`${API_BASE}/history/${file.filename}`);
        const data = await res.json();
        if (data.success) {
          return {
            content: filterBlocks(data),
            metadata: data.metadata
          };
        }
        return null;
      } catch {
        return null;
      }
    },
    []
  );

  return { historyFiles, fetchHistory, loadFromHistory };
}
