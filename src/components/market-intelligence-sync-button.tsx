"use client";

import { DatabaseZap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface SyncResponse {
  error?: string;
  agencies?: Array<{ cnpj: string; name: string; city: string | null }>;
  fetched?: { items: number; results: number };
  normalized?: { procurements: number; items: number; suppliers: number; results: number };
  persisted?: {
    buyers_seen?: number;
    procurements_inserted?: number;
    items_upserted?: number;
    suppliers_inserted?: number;
    results_upserted?: number;
    suppliers_touched?: number;
    skipped?: number;
  };
}

export function MarketIntelligenceSyncButton({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function synchronize() {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/inteligencia/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state: "SP",
          days: 30,
          itemLookbackDays: 180,
          cities: ["Ribeirão Preto", "Sertãozinho", "Barrinha", "Jaboticabal", "Araraquara"],
          agencyLimit: 6,
          pageLimit: 2,
          pageSize: 250,
        }),
      });
      const result = await response.json() as SyncResponse;
      if (!response.ok) throw new Error(result.error ?? "A sincronização histórica falhou.");
      setMessage(
        `${result.normalized?.suppliers ?? 0} fornecedores · ${result.persisted?.results_upserted ?? 0} resultados · ${result.agencies?.length ?? 0} órgãos`,
      );
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "A sincronização histórica falhou.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="sync-control">
      <button className="button button-green" onClick={synchronize} disabled={!enabled || pending}>
        <DatabaseZap size={16} className={pending ? "spin" : undefined} />
        {pending ? "Carregando histórico…" : "Carregar histórico GOV"}
      </button>
      {message && <span className="sync-message" role="status">{message}</span>}
    </div>
  );
}
