"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProspectSyncButton({ niche, radius }: { niche: string; radius: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/prospeccao/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche, radius }),
      });
      const result = await response.json() as { error?: string; consulted?: number; compatible?: number; inserted?: number; updated?: number };
      if (!response.ok) throw new Error(result.error ?? "Não foi possível consultar o PNCP agora.");
      setMessage(`${result.compatible ?? 0} compatíveis · ${result.consulted ?? 0} abertas verificadas · ${result.inserted ?? 0} novas · ${result.updated ?? 0} atualizadas`);
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
      {pending ? "Consultando PNCP ao vivo…" : "Buscar oportunidades agora"}
    </button>
    {message && <span className="sync-message" role="status">{message}</span>}
  </div>;
}
