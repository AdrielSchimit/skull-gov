import { describe, expect, it } from "vitest";
import { classifyEligibility, classifyVertical } from "@/lib/classification";

describe("central vertical classifier", () => {
  it("A: does not treat a contextual Banco de Alimentos mention as food retail", () => {
    expect(classifyVertical("Aquisição de sacos plásticos para o Banco de Alimentos").vertical).not.toBe("food_retail");
  });

  it("B: recognizes a concrete grocery basket", () => {
    expect(classifyVertical("Aquisição de arroz, feijão, leite e café").vertical).toBe("food_retail");
  });

  it("C: recognizes PNCP notice 07750478000188/2026/553 as fuel-station supply", () => {
    const result = classifyVertical("fornecimento de gasolina comum, etanol e diesel S-10 em posto de combustível.");
    expect(result.vertical).toBe("fuel_station");
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it("D: rejects fuel-management software from the fuel-station vertical", () => {
    expect(classifyVertical("Contratação de sistema informatizado para gestão de abastecimento e cartão combustível").vertical).not.toBe("fuel_station");
  });

  it("E: recognizes web application and SaaS procurement", () => {
    expect(classifyVertical("Desenvolvimento de aplicação web no modelo SaaS com integração de sistemas").vertical).toBe("software");
  });

  it("F: does not classify an urban drainage system as software", () => {
    expect(classifyVertical("Execução de sistema de drenagem urbana e rede de esgoto").vertical).not.toBe("software");
  });

  it("uses item and document evidence and normalizes case and accents", () => {
    expect(classifyVertical({ object: "Registro de preços", items: [{ descricao: "OLEO DIESEL S10" }] }).vertical).toBe("fuel_station");
  });
});

describe("participant eligibility classifier", () => {
  it("G: recognizes that individuals and companies may participate", () => {
    expect(classifyEligibility("Poderão participar pessoas físicas e jurídicas").status).toBe("individual_allowed");
  });

  it("H: recognizes an exclusively incorporated-company requirement", () => {
    expect(classifyEligibility("Participação exclusiva de pessoa jurídica regularmente constituída").status).toBe("company_required");
  });

  it("I: keeps ambiguous text unknown and never infers from CPF alone", () => {
    expect(classifyEligibility("Documentos para habilitação do fornecedor").status).toBe("unknown");
    expect(classifyEligibility("Informar CPF do representante legal").status).toBe("unknown");
  });

  it("does not use the isolated word empresa as a blocker", () => {
    expect(classifyEligibility("A empresa deverá anexar sua proposta").status).toBe("unknown");
  });
});
