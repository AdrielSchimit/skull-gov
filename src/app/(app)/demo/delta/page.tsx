import { DeltaDemo, type DeltaOpportunity } from "./delta-demo";

export const metadata = { title: "Delta Materiais · Radar real" };
export const dynamic = "force-dynamic";

const PNCP_BASES = ["https://pncp.gov.br/api/pncp/v1", "https://pncp.gov.br/pncp-api/v1"];

type PncpItem = {
  numeroItem?: number;
  descricao?: string;
  quantidade?: number;
  unidadeMedida?: string;
  valorUnitarioEstimado?: number | null;
  valorTotal?: number | null;
  tipoBeneficioNome?: string | null;
};

async function fetchPncpItems(cnpj: string, year: number, sequence: number): Promise<PncpItem[]> {
  for (const base of PNCP_BASES) {
    try {
      const response = await fetch(`${base}/orgaos/${cnpj}/compras/${year}/${sequence}/itens`, {
        headers: { Accept: "application/json", "User-Agent": "SKULL-GOV/1.0" },
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) continue;
      const payload = await response.json();
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.data)) return payload.data;
    } catch {
      // Tenta a próxima base oficial. Nunca substitui por item inventado.
    }
  }
  return [];
}

const sources: Array<Omit<DeltaOpportunity, "items" | "itemsAvailable"> & { cnpj: string; year: number; sequence: number }> = [
  {
    id: "bebedouro-pe50-2026",
    pncpControl: "45709920000111-1-002668/2026",
    cnpj: "45709920000111",
    year: 2026,
    sequence: 2668,
    purchase: "55/2026-PE50/2026",
    city: "Bebedouro/SP",
    distance: 42,
    title: "Registro de Preços para aquisição de materiais de construção, hidráulicos, madeiras, aço e acessórios",
    agency: "MUNICÍPIO DE BEBEDOURO",
    deadline: "2026-09-10T12:59:00-03:00",
    publishedAt: "2026-08-25T13:59:00-03:00",
    modality: "Pregão Eletrônico",
    source: "PNCP + Prefeitura de Bebedouro",
    sourceUrl: "https://pncp.gov.br/app/editais/45709920000111/2026/2668",
    officialNoticeUrl: "https://www.bebedouro.sp.gov.br/portal/index.php/aberto/item/28768-pregao-eletronico-n-50-2026",
    totalItems: 320,
    value: null,
    benefit: "Licitação diferenciada com cota reservada",
    fit: "Muito alta",
  },
  {
    id: "sao-jose-rio-pardo-pce21-2026",
    pncpControl: "45741659000137-1-000134/2026",
    cnpj: "45741659000137",
    year: 2026,
    sequence: 134,
    purchase: "PCE 21/2026",
    city: "São José do Rio Pardo/SP",
    distance: 142,
    title: "Registro de preços para futura e eventual aquisição de materiais de construção",
    agency: "MUNICÍPIO DE SÃO JOSÉ DO RIO PARDO · SECRETARIA DE OBRAS E PLANEJAMENTO",
    deadline: "2026-09-11T08:59:00-03:00",
    publishedAt: "2026-08-27T10:37:00-03:00",
    modality: "Pregão Eletrônico",
    source: "PNCP",
    sourceUrl: "https://pncp.gov.br/app/editais/45741659000137/2026/134",
    officialNoticeUrl: "https://pncp.gov.br/app/editais/45741659000137/2026/134",
    totalItems: 101,
    value: null,
    benefit: "Itens com participação exclusiva ME/EPP identificados na publicação",
    fit: "Muito alta",
  },
];

export default async function DeltaDemoPage() {
  const opportunities: DeltaOpportunity[] = await Promise.all(sources.map(async ({ cnpj, year, sequence, ...opportunity }) => {
    const items = await fetchPncpItems(cnpj, year, sequence);
    return {
      ...opportunity,
      itemsAvailable: items.length > 0,
      items: items.map((item, index) => ({
        id: item.numeroItem ?? index + 1,
        description: item.descricao?.trim() || `Item ${item.numeroItem ?? index + 1}`,
        unit: item.unidadeMedida?.trim() || "Não informada",
        quantity: item.quantidade ?? null,
        unitValue: item.valorUnitarioEstimado ?? null,
        totalValue: item.valorTotal ?? null,
        benefit: item.tipoBeneficioNome ?? null,
      })),
    };
  }));

  return <DeltaDemo opportunities={opportunities} />;
}
