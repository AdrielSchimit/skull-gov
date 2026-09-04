import type { MarketSupplierIdentity } from "@/lib/market-intelligence/types";

export function mergeSupplierIdentities(suppliers: MarketSupplierIdentity[]) {
  const byKey = new Map<string, MarketSupplierIdentity>();
  for (const supplier of suppliers) {
    const key = supplier.normalizedCnpj ? `pj:${supplier.normalizedCnpj}` : `${supplier.kind}:${supplier.legalName.trim().toLowerCase()}`;
    const current = byKey.get(key);
    if (!current) {
      byKey.set(key, supplier);
      continue;
    }
    byKey.set(key, {
      ...current,
      tradeName: current.tradeName ?? supplier.tradeName,
      city: current.city ?? supplier.city,
      state: current.state ?? supplier.state,
      mainCnae: current.mainCnae ?? supplier.mainCnae,
      sourceAliases: dedupeAliases([...current.sourceAliases, ...supplier.sourceAliases]),
    });
  }
  return [...byKey.values()];
}

function dedupeAliases(aliases: MarketSupplierIdentity["sourceAliases"]) {
  const seen = new Set<string>();
  return aliases.filter((alias) => {
    const key = `${alias.sourceSystem}:${alias.sourceKey}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

