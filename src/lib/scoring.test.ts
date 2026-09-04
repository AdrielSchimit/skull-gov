import { describe, expect, it } from "vitest";
import { isQuickCash, scoreOpportunity } from "@/lib/scoring";

describe("SKULL Score", () => {
  it("prioritizes a nearby pure-software opportunity", () => {
    const result = scoreOpportunity({ object: "Desenvolvimento de software, portal web, integração API e suporte", estimatedValue: 80_000, distanceKm: 35, closesAt: "2099-12-31T18:00:00Z", modality: "Dispensa de Licitação", disputeMode: "Eletrônico" });
    expect(result.skullScore).toBeGreaterThanOrEqual(70);
    expect(result.workingCapital).toBe("baixo");
    expect(result.recommendation).toBe("atacar");
    expect(isQuickCash({ ...result, estimatedValue: 80_000, distanceKm: 35 })).toBe(true);
  });

  it("penalizes equipment-heavy supply", () => {
    const result = scoreOpportunity({ object: "Aquisição e fornecimento de computadores, notebooks, impressoras e toner", estimatedValue: 900_000, distanceKm: 40, closesAt: "2099-12-31T18:00:00Z", modality: "Pregão Eletrônico", disputeMode: "Aberto" });
    expect(result.workingCapital).toBe("critico");
    expect(result.recommendation).toBe("evitar");
  });

  it("keeps Pay Risk unknown without verifiable evidence", () => {
    const result = scoreOpportunity({ object: "Manutenção de sistema", estimatedValue: null, distanceKm: null, closesAt: null, modality: "Dispensa", disputeMode: null });
    expect(result.payRisk).toBeNull();
    expect(result.explanation.some((line) => line.includes("dados públicos insuficientes"))).toBe(true);
  });
});
