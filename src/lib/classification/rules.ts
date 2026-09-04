import type { VerticalRule, WeightedTerm } from "@/lib/classification/types";

const strong = (...terms: string[]): WeightedTerm[] => terms.map((term) => ({ term, weight: 8 }));
const medium = (...terms: string[]): WeightedTerm[] => terms.map((term) => ({ term, weight: 4 }));
const weak = (...terms: string[]): WeightedTerm[] => terms.map((term) => ({ term, weight: 2 }));

export const CLASSIFICATION_VERSION = "2026.09.1";

export const VERTICAL_RULES: readonly VerticalRule[] = [
  {
    vertical: "software", label: "Software", defaultRadius: 200,
    description: "Software, SaaS, aplicações web, integrações, cloud e suporte de TI.", minimumScore: 6,
    positive: [
      ...strong("software", "saas", "sistema informatizado", "sistema de gestão", "desenvolvimento de sistema", "desenvolvimento de software", "aplicação web", "plataforma digital", "integração de sistemas", "suporte de ti", "sustentação de sistemas", "computação em nuvem", "licenciamento de software"),
      ...medium("aplicativo", "plataforma web", "automação", "inteligência artificial", "hospedagem", "portal web", "api"),
      ...weak("app", "cloud", "site"),
    ],
    negative: ["combustível", "obra civil", "material de construção", "medicamento", "gênero alimentício", "limpeza predial", "locação de veículo", "manutenção automotiva", "drenagem urbana", "rede de esgoto"],
  },
  {
    vertical: "fuel_station", label: "Posto de combustível", defaultRadius: 120,
    description: "Fornecimento direto de gasolina, etanol, diesel, ARLA e abastecimento em posto.", minimumScore: 6,
    positive: [
      ...strong("fornecimento de combustível", "aquisição de combustível", "aquisição de combustíveis", "combustível automotivo", "gasolina comum", "gasolina aditivada", "álcool combustível", "óleo diesel", "diesel s-10", "diesel s10", "diesel s-500", "abastecimento de frota", "abastecimento da frota", "posto de combustível", "arla 32"),
      ...medium("etanol", "gasolina", "óleo lubrificante automotivo"),
      ...weak("diesel"),
    ],
    negative: ["software", "sistema informatizado", "gestão de abastecimento", "gerenciamento de frota", "cartão combustível", "taxa de administração", "tanque de combustível", "bomba de combustível", "manutenção de bomba", "obra civil", "construção", "medicamento", "gênero alimentício"],
  },
  {
    vertical: "food_retail", label: "Supermercado / alimentos", defaultRadius: 180,
    description: "Aquisição direta de gêneros alimentícios, mercearia, bebidas e hortifruti.", minimumScore: 6,
    positive: [
      ...strong("gêneros alimentícios", "produtos alimentícios", "aquisição de alimentos", "fornecimento de alimentos", "cesta básica", "alimentos perecíveis", "alimentos não perecíveis"),
      ...medium("hortifruti", "hortifrutigranjeiro", "mercearia", "água mineral", "café torrado", "óleo de soja"),
      ...weak("arroz", "feijão", "leite", "café", "açúcar", "farinha", "macarrão", "biscoito", "frutas", "verduras", "legumes", "carne", "frango", "pão"),
    ],
    negative: ["software", "sistema informatizado", "plataforma digital", "esgoto", "saneamento", "execução de obra", "obra civil", "serviços de engenharia", "material de construção", "sacos plásticos", "sacolas plásticas", "embalagens plásticas", "combustível", "medicamento"],
  },
  {
    vertical: "construction_retail", label: "Materiais de construção", defaultRadius: 300,
    description: "Fornecimento de materiais hidráulicos, elétricos, ferragens e acabamento.", minimumScore: 6,
    positive: [
      ...strong("material de construção", "materiais de construção", "material elétrico", "material hidráulico"),
      ...medium("cimento", "argamassa", "ferragens", "tubos e conexões", "tintas e vernizes"),
      ...weak("tinta", "madeira", "aço", "telha", "piso", "revestimento", "ferramentas", "bloco", "areia", "brita", "tubos", "conexões"),
    ],
    negative: ["software", "gênero alimentício", "medicamento", "contratação de empresa especializada", "fornecimento de materiais e mão de obra", "execução de obra", "obra de construção", "serviços de engenharia", "projeto executivo"],
  },
  {
    vertical: "automotive", label: "Oficina / autopeças", defaultRadius: 250,
    description: "Peças, pneus, baterias e manutenção automotiva.", minimumScore: 6,
    positive: [...strong("manutenção de veículos", "manutenção de frota", "mecânica automotiva", "peças automotivas", "serviços automotivos"), ...medium("autopeças", "pneus", "baterias", "troca de óleo"), ...weak("freios", "suspensão", "alinhamento", "balanceamento")],
    negative: ["software", "gênero alimentício", "material de construção", "medicamento", "obra civil"],
  },
  {
    vertical: "office_stationery", label: "Papelaria / suprimentos", defaultRadius: 220,
    description: "Material escolar e de escritório, papel, toner e cartuchos.", minimumScore: 6,
    positive: [...strong("material de escritório", "material escolar", "suprimentos de escritório"), ...medium("papelaria", "papel a4", "papel sulfite", "toner", "cartucho"), ...weak("caneta", "envelope", "caderno", "lápis")],
    negative: ["software", "obra civil", "medicamento", "gênero alimentício", "serviços de impressão"],
  },
  {
    vertical: "pharmacy", label: "Farmácia / saúde", defaultRadius: 180,
    description: "Medicamentos e insumos compatíveis com varejo farmacêutico.", minimumScore: 6,
    positive: [...strong("medicamentos", "produto farmacêutico", "produtos farmacêuticos", "material médico hospitalar", "material hospitalar"), ...medium("insumos de saúde", "fraldas descartáveis", "curativos", "seringas")],
    negative: ["software", "obra civil", "gênero alimentício", "serviço médico", "contratação de médico"],
  },
  {
    vertical: "clothing", label: "Vestuário / confecção", defaultRadius: 220,
    description: "Uniformes, camisetas, jalecos, calçados e confecção.", minimumScore: 6,
    positive: [...strong("uniformes", "confecção de uniformes"), ...medium("vestuário", "camisetas", "jalecos", "calçados", "confecção"), ...weak("calças", "camisa social", "agasalho", "bermuda", "botina")],
    negative: ["software", "obra civil", "medicamento", "gênero alimentício", "serviço de lavanderia"],
  },
  {
    vertical: "architecture", label: "Arquitetura e urbanismo", defaultRadius: 300,
    description: "Projetos de arquitetura, urbanismo, paisagismo e acessibilidade.", minimumScore: 6,
    positive: [...strong("projeto arquitetônico", "serviços de arquitetura", "levantamento arquitetônico", "estudo preliminar de arquitetura"), ...medium("arquitetura", "urbanismo", "paisagismo", "acessibilidade", "revitalização urbana", "projeto de interiores")],
    negative: ["fornecimento de medicamento", "gênero alimentício", "combustível", "execução de obra", "material de construção"],
  },
] as const;

export const ELIGIBILITY_POSITIVE = [
  "pessoa física ou jurídica", "pessoas físicas e jurídicas", "pessoa física", "fornecedor pessoa física", "profissional autônomo", "profissional liberal",
] as const;

export const ELIGIBILITY_BLOCKERS = [
  "somente pessoas jurídicas", "exclusivamente pessoas jurídicas", "pessoa jurídica regularmente constituída", "empresa devidamente constituída", "cnpj obrigatório",
] as const;
