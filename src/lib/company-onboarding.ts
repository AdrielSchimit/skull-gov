import "server-only";

import { VERTICAL_RULES, type Vertical } from "@/lib/classification";

const BRASIL_API = "https://brasilapi.com.br/api/cnpj/v1";

type BrasilApiCompany = {
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  municipio?: string;
  uf?: string;
  cnae_fiscal?: number | string;
  cnae_fiscal_descricao?: string;
  cnaes_secundarios?: Array<{ codigo?: number | string; descricao?: string }>;
  descricao_situacao_cadastral?: string;
};

export type CompanyProfile = {
  cnpj: string;
  legalName: string;
  tradeName: string;
  city: string;
  state: string;
  cnaes: string[];
  nicheCode: string;
  nicheLabel: string;
  positiveKeywords: string[];
  negativeKeywords: string[];
  recommendedRadiusKm: number;
  sourceData: Record<string, unknown>;
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

const CNAE_PROFILES: ReadonlyArray<{ vertical: Exclude<Vertical, "unknown">; match: readonly string[] }> = [
  { vertical: "construction_retail", match: ["material de construcao", "ferragens", "madeira", "cimento", "tintas", "hidraul", "eletric", "construcao"] },
  { vertical: "fuel_station", match: ["comercio varejista de combustiveis", "posto de combustiveis", "combustiveis para veiculos", "gasolina", "etanol", "oleo diesel"] },
  { vertical: "automotive", match: ["manutencao e reparacao de veiculos", "pecas e acessorios para veiculos", "oficina mecanica", "automoveis"] },
  { vertical: "architecture", match: ["servicos de arquitetura", "arquitetura", "urbanismo", "paisagismo", "engenharia"] },
  { vertical: "software", match: ["desenvolvimento de programas", "tecnologia da informacao", "software", "consultoria em tecnologia", "tratamento de dados"] },
  { vertical: "food_retail", match: ["comercio varejista de mercadorias em geral", "supermercado", "minimercado", "alimentos"] },
  { vertical: "office_stationery", match: ["artigos de papelaria", "papelaria", "material de escritorio"] },
  { vertical: "pharmacy", match: ["produtos farmaceuticos", "farmacia", "medicamentos"] },
  { vertical: "clothing", match: ["artigos do vestuario", "confeccao", "roupas", "calcados"] },
];

function classify(cnaeText: string) {
  const value = normalize(cnaeText);
  const winner = CNAE_PROFILES.map((profile) => ({ profile, score: profile.match.reduce((n, term) => n + (value.includes(term) ? 1 : 0), 0) }))
    .sort((a, b) => b.score - a.score)[0];
  if (winner && winner.score > 0) {
    const rule = VERTICAL_RULES.find((candidate) => candidate.vertical === winner.profile.vertical);
    if (rule) return { code: rule.vertical, label: rule.label, radius: rule.defaultRadius, positive: rule.positive.map(({ term }) => term), negative: [...rule.negative] };
  }
  return {
    code: "general_supplier", label: "Fornecedor geral", radius: 250,
    positive: ["fornecimento","aquisição","registro de preços","serviços"],
    negative: [] as string[],
  };
}

export async function lookupAndClassifyCompany(rawCnpj: string): Promise<CompanyProfile> {
  const cnpj = rawCnpj.replace(/\D/g, "");
  if (cnpj.length !== 14) throw new Error("Informe um CNPJ com 14 dígitos.");
  const response = await fetch(`${BRASIL_API}/${cnpj}`, { headers: { Accept: "application/json", "User-Agent": "SKULL-GOV/1.0" }, next: { revalidate: 86_400 } });
  if (!response.ok) throw new Error(response.status === 404 ? "CNPJ não encontrado na base pública." : "Não foi possível consultar o CNPJ agora.");
  const company = await response.json() as BrasilApiCompany;
  const cnaes = [company.cnae_fiscal_descricao, ...(company.cnaes_secundarios ?? []).map((item) => item.descricao)].filter(Boolean) as string[];
  const profile = classify(cnaes.join(" · "));
  return {
    cnpj,
    legalName: company.razao_social?.trim() || `Empresa ${cnpj}`,
    tradeName: company.nome_fantasia?.trim() || company.razao_social?.trim() || `Empresa ${cnpj}`,
    city: company.municipio?.trim() || "Não informado",
    state: company.uf?.trim().toUpperCase() || "SP",
    cnaes,
    nicheCode: profile.code,
    nicheLabel: profile.label,
    positiveKeywords: [...profile.positive],
    negativeKeywords: [...profile.negative],
    recommendedRadiusKm: profile.radius,
    sourceData: {
      source: "BrasilAPI",
      cnae_fiscal: company.cnae_fiscal ?? null,
      cnae_fiscal_descricao: company.cnae_fiscal_descricao ?? null,
      situacao_cadastral: company.descricao_situacao_cadastral ?? null,
    },
  };
}
