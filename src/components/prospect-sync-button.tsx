"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProspectSyncButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/pncp/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: "SP", days: 30 }),
      });
      const result = await response.json() as { error?: string; unique?: number; inserted?: number; updated?: number };
      if (!response.ok) throw new Error(result.error ?? "Não foi possível atualizar as fontes agora.");
      setMessage(`${result.unique ?? 0} oportunidades consultadas · ${result.inserted ?? 0} novas · ${result.updated ?? 0} atualizadas`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha na atualização.");
    } finally {
      setPending(false);
    }
  }

  return <div className="sync-control">
    <button className="button button-green" onClick={run} disabled={pending}>
      <RefreshCw size={16} className={pending ? "spin" : undefined} />
      {pending ? "Buscando nas fontes oficiais…" : "Buscar oportunidades agora"}
    </button>
    {message && <span className="sync-message" role="status">{message}</span>}
  </div>;
}
