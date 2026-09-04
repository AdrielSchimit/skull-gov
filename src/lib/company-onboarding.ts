import "server-only";

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

const PROFILES = [
  {
    code: "construction_retail", label: "Materiais de construção", radius: 300,
    match: ["material de construcao", "ferragens", "madeira", "cimento", "tintas", "hidraul", "eletric", "construcao"],
    positive: ["material de construção","materiais de construção","cimento","argamassa","tinta","pintura","elétrica","hidráulico","ferragens","madeira","aço","telha","piso","revestimento","ferramentas","EPI","bloco","areia","brita","PVC","tubos","conexões","escadas"],
    negative: ["software","medicamento","gênero alimentício","veículo","serviço médico"],
  },
  {
    code: "automotive", label: "Oficina / autopeças", radius: 250,
    match: ["manutencao e reparacao de veiculos", "pecas e acessorios para veiculos", "oficina mecanica", "automoveis"],
    positive: ["manutenção de veículos","mecânica","autopeças","troca de óleo","freios","suspensão","alinhamento","balanceamento","pneus","baterias","elétrica automotiva","peças automotivas","filtros","lubrificantes"],
    negative: ["software","construção civil","medicamento","gênero alimentício"],
  },
  {
    code: "architecture_urbanism", label: "Arquitetura, urbanismo e paisagismo", radius: 300,
    match: ["servicos de arquitetura", "arquitetura", "urbanismo", "paisagismo", "engenharia"],
    positive: ["projeto arquitetônico","arquitetura","urbanismo","paisagismo","acessibilidade","levantamento arquitetônico","estudo preliminar","projeto executivo","fachada","interiores","praça","parque","arborização","revitalização urbana"],
    negative: ["fornecimento de medicamentos","gênero alimentício","toner","combustível"],
  },
  {
    code: "technology", label: "Tecnologia e software", radius: 200,
    match: ["desenvolvimento de programas", "tecnologia da informacao", "software", "consultoria em tecnologia", "tratamento de dados"],
    positive: ["software","sistema","site","portal","aplicativo","dashboard","automação","integração","API","SaaS","hospedagem","cloud","suporte de TI","desenvolvimento","digitalização","plataforma web","inteligência artificial"],
    negative: ["material de construção","medicamento","gênero alimentício","veículo","mobiliário"],
  },
  {
    code: "food_retail", label: "Mercado / alimentos", radius: 180,
    match: ["comercio varejista de mercadorias em geral", "supermercado", "minimercado", "alimentos"],
    positive: ["gêneros alimentícios","alimentos","cesta básica","hortifruti","bebidas","mercearia","produtos alimentícios","água mineral","café","açúcar","arroz","feijão","leite"],
    negative: ["software","obra civil","medicamento","serviço de engenharia"],
  },
  {
    code: "office_stationery", label: "Papelaria / suprimentos", radius: 220,
    match: ["artigos de papelaria", "papelaria", "material de escritorio"],
    positive: ["material de escritório","papelaria","papel A4","caneta","pasta","envelope","material escolar","suprimentos","toner","cartucho"],
    negative: ["obra civil","medicamento","alimentos","veículos"],
  },
  {
    code: "pharmacy", label: "Farmácia / produtos de saúde", radius: 180,
    match: ["produtos farmaceuticos", "farmacia", "medicamentos"],
    positive: ["medicamentos","material hospitalar","insumos de saúde","produtos farmacêuticos","curativos","seringas","EPIs hospitalares"],
    negative: ["software","obra civil","gênero alimentício","veículo"],
  },
  {
    code: "clothing", label: "Vestuário / confecção", radius: 220,
    match: ["artigos do vestuario", "confeccao", "roupas", "calcados"],
    positive: ["uniformes","vestuário","camisetas","calças","jalecos","calçados","confecção","EPI vestuário"],
    negative: ["software","obra civil","medicamento","alimentos"],
  },
] as const;

function classify(cnaeText: string) {
  const value = normalize(cnaeText);
  const winner = PROFILES.map((profile) => ({ profile, score: profile.match.reduce((n, term) => n + (value.includes(term) ? 1 : 0), 0) }))
    .sort((a, b) => b.score - a.score)[0];
  if (winner && winner.score > 0) return winner.profile;
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
