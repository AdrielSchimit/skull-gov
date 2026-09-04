"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SyncButton({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function synchronize() {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/pncp/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state: "SP", days: 14 }) });
      const result = await response.json() as { error?: string; found?: number; inserted?: number; updated?: number; unique?: number };
      if (!response.ok) throw new Error(result.error ?? "A sincronização falhou.");
      setMessage(`${result.unique ?? result.found ?? 0} únicas · ${result.inserted ?? 0} novas · ${result.updated ?? 0} atualizadas`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "A sincronização falhou.");
    } finally {
      setPending(false);
    }
  }

  return <div className="sync-control"><button className="button button-green" onClick={synchronize} disabled={!enabled || pending}><RefreshCw size={16} className={pending ? "spin" : undefined} />{pending ? "Sincronizando…" : "Sincronizar Radar"}</button>{message && <span className="sync-message" role="status">{message}</span>}</div>;
}
