import { describe, expect, it } from "vitest";
import { BARRINHA_COORDINATES, distanceFromBarrinha, haversineDistance } from "@/lib/geo";

describe("geographic distance", () => {
  it("returns zero for the base city", () => {
    expect(haversineDistance(BARRINHA_COORDINATES, BARRINHA_COORDINATES)).toBe(0);
    expect(distanceFromBarrinha("Barrinha", "SP")).toBe(0);
  });

  it("normalizes accents and resolves known cities", () => {
    expect(distanceFromBarrinha("Ribeirão Preto", "SP")).toBeGreaterThan(30);
    expect(distanceFromBarrinha("Ribeirão Preto", "SP")).toBeLessThan(50);
  });

  it("does not fabricate coordinates for unknown cities", () => {
    expect(distanceFromBarrinha("Cidade inexistente", "SP")).toBeNull();
  });
});
