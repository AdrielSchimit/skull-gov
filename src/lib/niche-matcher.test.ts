import { describe, expect, it } from "vitest";
import { matchesProspectingOpportunity } from "@/lib/niche-matcher";

const item = (object: string, distance_km = 40) => ({ object, distance_km });

describe("strict niche matching", () => {
  it("accepts real supermarket supply objects", () => {
    expect(matchesProspectingOpportunity(item("REGISTRO DE PREÇOS para aquisição de gêneros alimentícios, café, leite e açúcar"), "food_retail", 180)).toBe(true);
    expect(matchesProspectingOpportunity(item("AQUISIÇÃO DE CAFÉ TORRADO E MOÍDO, EM PACOTES DE 500 GRAMAS"), "food_retail", 180)).toBe(true);
  });

  it("rejects context-only food mentions", () => {
    expect(matchesProspectingOpportunity(item("Aquisição de sacos e sacolas plásticas para utilização no Banco de Alimentos"), "food_retail", 180)).toBe(false);
    expect(matchesProspectingOpportunity(item("Contratação de sistema informatizado para gestão de distribuição de gêneros alimentícios"), "food_retail", 180)).toBe(false);
    expect(matchesProspectingOpportunity(item("Execução de obra de rede de esgoto no prédio do Banco de Alimentos"), "food_retail", 180)).toBe(false);
  });

  it("keeps construction retail separate from construction services", () => {
    expect(matchesProspectingOpportunity(item("Registro de preços para aquisição de materiais de construção, cimento, tubos e conexões"), "construction_retail", 300)).toBe(true);
    expect(matchesProspectingOpportunity(item("Contratação de empresa especializada com fornecimento de materiais e mão de obra para reforma de escola"), "construction_retail", 300)).toBe(false);
  });

  it("isolates direct fuel supply for gas stations", () => {
    expect(matchesProspectingOpportunity(item("Fornecimento de combustível automotivo (gasolina comum, etanol e óleo diesel S-10) em posto de combustível", 24), "fuel_retail", 120)).toBe(true);
    expect(matchesProspectingOpportunity(item("Contratação de sistema informatizado para gestão de abastecimento e cartão combustível", 24), "fuel_retail", 120)).toBe(false);
    expect(matchesProspectingOpportunity(item("Execução de rede de esgoto com abastecimento de máquinas a diesel", 24), "fuel_retail", 120)).toBe(false);
  });

  it("respects the configured radius", () => {
    expect(matchesProspectingOpportunity(item("Aquisição de gêneros alimentícios", 181), "food_retail", 180)).toBe(false);
  });
});
