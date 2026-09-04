import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Opportunity } from "@/lib/types";

export const PROSPECTING_PROFILES = {
  food_retail: {
    label: "Supermercado / alimentos",
    description: "Gêneros alimentícios, mercearia, bebidas, hortifruti e cestas.",
    defaultRadius: 180,
    positive: ["gêneros alimentícios", "generos alimenticios", "alimentos", "alimentícios", "alimenticios", "cesta básica", "cestas básicas", "hortifruti", "bebidas", "mercearia", "produtos alimentícios", "produtos alimenticios", "água mineral", "agua mineral", "café", "cafe", "açúcar", "acucar", "arroz", "feijão", "feijao", "leite", "farinha", "óleo", "oleo", "macarrão", "macarrao", "biscoito", "frutas", "verduras"],
    negative: ["software", "obra civil", "medicamento", "engenharia", "nutrição enteral", "nutricao enteral", "equipamento hospitalar"],
  },
  construction_retail: {
    label: "Materiais de construção",
    description: "Construção, hidráulica, elétrica, ferragens, ferramentas e acabamento.",
    defaultRadius: 300,
    positive: ["material de construção", "materiais de construção", "cimento", "argamassa", "tinta", "hidráulico", "hidraulico", "elétrica", "eletrica", "ferragens", "madeira", "aço", "aco", "telha", "piso", "revestimento", "ferramentas", "bloco", "areia", "brita", "PVC", "tubos", "conexões", "conexoes"],
    negative: ["software", "medicamento", "gênero alimentício", "genero alimenticio"],
  },
  automotive: {
    label: "Oficina / autopeças",
    description: "Manutenção de frota, peças, pneus, baterias e serviços automotivos.",
    defaultRadius: 250,
    positive: ["manutenção de veículos", "manutencao de veiculos", "mecânica", "mecanica", "autopeças", "autopecas", "pneus", "baterias", "peças automotivas", "pecas automotivas", "lubrificantes", "troca de óleo", "troca de oleo", "filtros", "freios", "suspensão", "suspensao"],
    negative: ["software", "construção civil", "construcao civil", "medicamento", "alimentos"],
  },
  office_stationery: {
    label: "Papelaria / suprimentos",
    description: "Material escolar e de escritório, papel, toner e cartuchos.",
    defaultRadius: 220,
    positive: ["material de escritório", "material de escritorio", "papelaria", "papel A4", "caneta", "material escolar", "suprimentos", "toner", "cartucho", "envelope", "pastas"],
    negative: ["obra civil", "medicamento", "alimentos", "veículos", "veiculos"],
  },
  pharmacy: {
    label: "Farmácia / saúde",
    description: "Medicamentos e insumos compatíveis com varejo farmacêutico.",
    defaultRadius: 180,
    positive: ["medicamentos", "produtos farmacêuticos", "produtos farmaceuticos", "curativos", "seringas", "insumos de saúde", "insumos de saude"],
    negative: ["software", "obra civil", "alimentos", "veículo", "veiculo"],
  },
  clothing: {
    label: "Vestuário / confecção",
    description: "Uniformes, camisetas, jalecos, calçados e confecção.",
    defaultRadius: 220,
    positive: ["uniformes", "vestuário", "vestuario", "camisetas", "calças", "calcas", "jalecos", "calçados", "calcados", "confecção", "confeccao"],
    negative: ["software", "obra civil", "medicamento", "alimentos"],
  },
} as const;

export type ProspectingProfileKey = keyof typeof PROSPECTING_PROFILES;

function normalize(value: string | null | undefined) {
  return (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function matchesAny(value: string, terms: readonly string[]) {
  const haystack = normalize(value);
  return terms.some((term) => haystack.includes(normalize(term)));
}

export async function getProspectingOpportunities(profileKey: ProspectingProfileKey, radiusKm: number) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { data: [] as Opportunity[], count: 0, error: "Supabase não configurado." };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [] as Opportunity[], count: 0, error: "Sessão necessária." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "skull_admin") return { data: [] as Opportunity[], count: 0, error: "Acesso restrito à gestão SKULL." };

  const niche = PROSPECTING_PROFILES[profileKey];
  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .or(`closes_at.gte.${new Date().toISOString()},closes_at.is.null`)
    .order("closes_at", { ascending: true, nullsFirst: false })
    .limit(1000);

  if (error) return { data: [] as Opportunity[], count: 0, error: error.message };

  const filtered = ((data ?? []) as unknown as Opportunity[])
    .filter((item) => matchesAny(item.object, niche.positive))
    .filter((item) => !matchesAny(item.object, niche.negative))
    .filter((item) => typeof item.distance_km === "number" && item.distance_km <= radiusKm)
    .sort((a, b) => {
      const distance = (a.distance_km ?? 9999) - (b.distance_km ?? 9999);
      if (distance !== 0) return distance;
      return new Date(a.closes_at ?? "2999-12-31").getTime() - new Date(b.closes_at ?? "2999-12-31").getTime();
    });

  return { data: filtered.slice(0, 30), count: filtered.length, error: null as string | null };
}
