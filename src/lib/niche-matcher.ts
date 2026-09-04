import type { Opportunity } from "@/lib/types";

export const PROSPECTING_PROFILES = {
  food_retail: {
    label: "Supermercado / alimentos",
    description: "Gêneros alimentícios, mercearia, bebidas, hortifruti e cestas.",
    defaultRadius: 180,
    positive: [
      "gêneros alimentícios", "generos alimenticios", "produtos alimentícios", "produtos alimenticios",
      "aquisição de alimentos", "aquisicao de alimentos", "fornecimento de alimentos",
      "cesta básica", "cesta basica", "cestas básicas", "cestas basicas",
      "hortifruti", "hortifrutigranjeiro", "mercearia", "água mineral", "agua mineral",
      "café torrado", "cafe torrado", "café em grãos", "cafe em graos", "café moído", "cafe moido",
      "açúcar", "acucar", "arroz", "feijão", "feijao", "leite", "farinha", "óleo de soja", "oleo de soja",
      "macarrão", "macarrao", "biscoito", "bolacha", "refrigerante", "suco", "frutas", "verduras", "legumes",
      "carne", "frango", "pão", "pao", "bolo", "margarina", "achocolatado", "bebidas não alcoólicas",
      "bebidas nao alcoolicas", "alimentos perecíveis", "alimentos pereciveis", "alimentos não perecíveis",
      "alimentos nao pereciveis",
    ],
    negative: [
      "software", "licença de uso", "licenca de uso", "sistema informatizado", "sistema de gestão", "sistema de gestao",
      "tecnologia da informação", "tecnologia da informacao", "plataforma digital", "aplicativo", "desenvolvimento de sistema",
      "esgoto", "saneamento", "rede coletora", "estação de tratamento", "estacao de tratamento",
      "execução de obra", "execucao de obra", "obra de construção", "obra de construcao", "reforma de", "pavimentação", "pavimentacao",
      "serviços de engenharia", "servicos de engenharia", "projeto executivo", "material de construção", "materiais de construção",
      "sacos plásticos", "sacos plasticos", "sacolas plásticas", "sacolas plasticas", "embalagens plásticas", "embalagens plasticas",
      "combustível", "combustivel", "veículo", "veiculo", "medicamento", "material hospitalar",
    ],
  },
  construction_retail: {
    label: "Materiais de construção",
    description: "Construção, hidráulica, elétrica, ferragens, ferramentas e acabamento.",
    defaultRadius: 300,
    positive: [
      "material de construção", "materiais de construção", "cimento", "argamassa", "tinta", "hidráulico", "hidraulico",
      "elétrica", "eletrica", "ferragens", "madeira", "aço", "aco", "telha", "piso", "revestimento", "ferramentas",
      "bloco", "areia", "brita", "PVC", "PEAD", "tubos", "conexões", "conexoes", "escadas", "betoneira", "martelete",
      "lavadora de alta pressão", "lavadora de alta pressao", "material elétrico", "material eletrico", "material hidráulico",
      "material hidraulico",
    ],
    negative: [
      "software", "tecnologia da informação", "tecnologia da informacao", "gêneros alimentícios", "generos alimenticios",
      "medicamento", "material hospitalar", "contratação de empresa especializada", "contratacao de empresa especializada",
      "fornecimento de materiais e mão de obra", "fornecimento de materiais e mao de obra", "execução de obra", "execucao de obra",
      "obra de construção", "obra de construcao", "serviços de engenharia", "servicos de engenharia", "projeto executivo",
    ],
  },
  automotive: {
    label: "Oficina / autopeças",
    description: "Manutenção de frota, peças, pneus, baterias e serviços automotivos.",
    defaultRadius: 250,
    positive: [
      "manutenção de veículos", "manutencao de veiculos", "manutenção de frota", "manutencao de frota", "mecânica automotiva",
      "mecanica automotiva", "autopeças", "autopecas", "pneus", "baterias", "peças automotivas", "pecas automotivas",
      "lubrificantes", "troca de óleo", "troca de oleo", "filtros automotivos", "freios", "suspensão", "suspensao",
      "alinhamento", "balanceamento", "serviços automotivos", "servicos automotivos",
    ],
    negative: [
      "software", "gêneros alimentícios", "generos alimenticios", "material de construção", "materiais de construção",
      "medicamento", "material hospitalar", "obra civil",
    ],
  },
  office_stationery: {
    label: "Papelaria / suprimentos",
    description: "Material escolar e de escritório, papel, toner e cartuchos.",
    defaultRadius: 220,
    positive: [
      "material de escritório", "material de escritorio", "papelaria", "papel A4", "papel sulfite", "caneta", "material escolar",
      "suprimentos de escritório", "suprimentos de escritorio", "toner", "cartucho", "envelope", "pastas arquivo", "caderno",
      "lápis", "lapis", "borracha escolar",
    ],
    negative: [
      "software", "obra civil", "medicamento", "gêneros alimentícios", "generos alimenticios", "veículos", "veiculos",
      "serviços de impressão", "servicos de impressao",
    ],
  },
  pharmacy: {
    label: "Farmácia / saúde",
    description: "Medicamentos e insumos compatíveis com varejo farmacêutico.",
    defaultRadius: 180,
    positive: [
      "medicamentos", "produto farmacêutico", "produto farmaceutico", "produtos farmacêuticos", "produtos farmaceuticos",
      "curativos", "seringas", "insumos de saúde", "insumos de saude", "material médico hospitalar", "material medico hospitalar",
      "material hospitalar", "fraldas descartáveis", "fraldas descartaveis",
    ],
    negative: [
      "software", "obra civil", "gêneros alimentícios", "generos alimenticios", "veículo", "veiculo", "serviço médico", "servico medico",
      "contratação de médico", "contratacao de medico",
    ],
  },
  clothing: {
    label: "Vestuário / confecção",
    description: "Uniformes, camisetas, jalecos, calçados e confecção.",
    defaultRadius: 220,
    positive: [
      "uniformes", "vestuário", "vestuario", "camisetas", "calças", "calcas", "jalecos", "calçados", "calcados", "confecção",
      "confeccao", "camisa social", "agasalho", "bermuda", "botina", "tênis", "tenis",
    ],
    negative: [
      "software", "obra civil", "medicamento", "gêneros alimentícios", "generos alimenticios", "serviço de lavanderia",
      "servico de lavanderia",
    ],
  },
} as const;

export type ProspectingProfileKey = keyof typeof PROSPECTING_PROFILES;

export function normalizeNicheText(value: string | null | undefined) {
  return (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function matchesAny(value: string, terms: readonly string[]) {
  const haystack = normalizeNicheText(value);
  return terms.some((term) => haystack.includes(normalizeNicheText(term)));
}

export function isProspectingProfileKey(value: unknown): value is ProspectingProfileKey {
  return typeof value === "string" && value in PROSPECTING_PROFILES;
}

export function matchesProspectingOpportunity(
  item: Pick<Opportunity, "object" | "distance_km">,
  profileKey: ProspectingProfileKey,
  radiusKm: number,
) {
  const niche = PROSPECTING_PROFILES[profileKey];
  return matchesAny(item.object, niche.positive)
    && !matchesAny(item.object, niche.negative)
    && typeof item.distance_km === "number"
    && item.distance_km <= radiusKm;
}
