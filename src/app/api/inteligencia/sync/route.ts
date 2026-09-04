import { NextResponse } from "next/server";
import { z } from "zod";
import {
  fetchComprasGovHistoricalItems,
  fetchComprasGovHistoricalResults,
  normalizeComprasGovItem,
  normalizeComprasGovResult,
  type ComprasGovProcurementItemRow,
  type ComprasGovResultRow,
} from "@/lib/market-intelligence/adapters/compras-gov-history";
import { normalizeCnpj } from "@/lib/market-intelligence/cnpj";
import { COMPRAS_GOV_MODALITIES, fetchComprasGovContractings } from "@/lib/sources/compras-gov";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PncpContracting } from "@/lib/pncp/pncp-types";

export const runtime = "nodejs";
export const maxDuration = 60;

const DEFAULT_CITIES = ["Ribeirão Preto", "Sertãozinho", "Barrinha", "Jaboticabal", "Araraquara"];
const bodySchema = z.object({
  state: z.string().regex(/^[A-Z]{2}$/).default("SP"),
  days: z.number().int().min(1).max(365).default(90),
  itemLookbackDays: z.number().int().min(30).max(730).default(365),
  cities: z.array(z.string().min(2).max(80)).max(12).default(DEFAULT_CITIES),
  agencyLimit: z.number().int().min(1).max(10).default(6),
  pageLimit: z.number().int().min(1).max(3).default(1),
  pageSize: z.number().int().min(10).max(500).default(100),
});

type BuyerSeed = {
  cnpj: string;
  name: string;
  unitCode: string | null;
  unitName: string | null;
  city: string | null;
  state: string;
  municipalityCode: string | null;
  hits: number;
};

type ProcurementSeed = {
  source_key: string;
  source_url: string;
  source_updated_at: string | null;
  raw_hash: string | null;
  title: string | null;
  object: string | null;
  modality: string | null;
  process_number: string | null;
  purchase_number: string | null;
  year: number | null;
  coverage_status: "partial";
  buyer_agency_cnpj: string;
  buyer_uasg: string | null;
  buyer_unit_name: string | null;
};

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);
const normalizeText = (value: string | null | undefined) => (value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .trim()
  .toLowerCase();

const buyerKey = (cnpj: string, unitCode: string | null | undefined) => `${cnpj}:${unitCode?.trim() || "entity"}`;
const isLocallyScopedAgency = (name: string | null | undefined) => {
  const value = normalizeText(name);
  return value.includes("municipio") || value.includes("prefeitura") || value.includes("servico autonomo") || value.includes("camara municipal");
};

function addBuyer(target: Map<string, BuyerSeed>, input: Omit<BuyerSeed, "hits">, weight = 1) {
  const cnpj = normalizeCnpj(input.cnpj);
  if (!cnpj) return;
  const key = buyerKey(cnpj, input.unitCode);
  const current = target.get(key);
  if (!current) {
    target.set(key, { ...input, cnpj, hits: weight });
    return;
  }
  target.set(key, {
    ...current,
    name: current.name || input.name,
    unitName: current.unitName ?? input.unitName,
    city: current.city ?? input.city,
    state: current.state || input.state,
    municipalityCode: current.municipalityCode ?? input.municipalityCode,
    hits: current.hits + weight,
  });
}

async function collectItems(input: z.infer<typeof bodySchema>, buyer: BuyerSeed, startDate: string, endDate: string) {
  const rows: ComprasGovProcurementItemRow[] = [];
  for (let page = 1; page <= input.pageLimit; page += 1) {
    const result = await fetchComprasGovHistoricalItems({
      startDate,
      endDate,
      page,
      pageSize: input.pageSize,
      agencyCnpj: buyer.cnpj,
      unitCode: buyer.unitCode ?? undefined,
    });
    rows.push(...(result.resultado ?? []));
    if (!result.totalPaginas || page >= result.totalPaginas) break;
  }
  return rows;
}

async function collectResults(input: z.infer<typeof bodySchema>, buyer: BuyerSeed, startDate: string, endDate: string) {
  const rows: ComprasGovResultRow[] = [];
  for (let page = 1; page <= input.pageLimit; page += 1) {
    const result = await fetchComprasGovHistoricalResults({
      startDate,
      endDate,
      page,
      pageSize: input.pageSize,
      agencyCnpj: buyer.cnpj,
      unitCode: buyer.unitCode ?? undefined,
    });
    rows.push(...(result.resultado ?? []));
    if (!result.totalPaginas || page >= result.totalPaginas) break;
  }
  return rows;
}

function procurementKeyFromRaw(row: Pick<ComprasGovProcurementItemRow, "idCompra" | "numeroControlePNCPCompra" | "idContratacaoPNCP"> | Pick<ComprasGovResultRow, "idCompra" | "numeroControlePNCPCompra" | "idContratacaoPNCP">) {
  const pncp = row.numeroControlePNCPCompra ?? row.idContratacaoPNCP;
  if (pncp?.trim()) return `pncp:${pncp.trim()}`;
  if (row.idCompra?.trim()) return `compras_gov:compra:${row.idCompra.trim()}`;
  return null;
}

function contractingForKey(key: string, byControl: Map<string, PncpContracting>) {
  return key.startsWith("pncp:") ? byControl.get(key.slice(5)) : undefined;
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sessão necessária." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "skull_admin") return NextResponse.json({ error: "Apenas SKULL Admin pode sincronizar Inteligência." }, { status: 403 });

  let input: z.infer<typeof bodySchema>;
  try {
    input = bodySchema.parse(await request.json().catch(() => ({})));
  } catch {
    return NextResponse.json({ error: "Parâmetros de sincronização inválidos." }, { status: 400 });
  }

  const now = new Date();
  const resultStart = new Date(now.getTime() - input.days * 86_400_000);
  const itemStart = new Date(now.getTime() - input.itemLookbackDays * 86_400_000);
  const endDate = toIsoDate(now);
  const resultStartDate = toIsoDate(resultStart);
  const itemStartDate = toIsoDate(itemStart);

  const { data: run, error: runError } = await supabase
    .from("market_ingestion_runs")
    .insert({
      source_system: "compras_gov",
      resource: "regional_items_results",
      status: "running",
      started_by: user.id,
      filters: input,
      cursor_snapshot: { resultStartDate, itemStartDate, endDate },
    })
    .select("id")
    .single();
  if (runError || !run) return NextResponse.json({ error: runError?.message ?? "Não foi possível registrar o job." }, { status: 500 });

  try {
    const targetCities = new Set(input.cities.map(normalizeText));
    const buyersByKey = new Map<string, BuyerSeed>();

    const { data: knownOpportunities } = await supabase
      .from("opportunities")
      .select("agency_cnpj,agency_name,unit_name,city,state")
      .eq("state", input.state)
      .in("city", input.cities)
      .limit(500);
    for (const row of knownOpportunities ?? []) {
      if (!row.agency_cnpj || !isLocallyScopedAgency(row.agency_name)) continue;
      addBuyer(buyersByKey, {
        cnpj: row.agency_cnpj,
        name: row.agency_name ?? row.agency_cnpj,
        unitCode: null,
        unitName: row.unit_name ?? null,
        city: row.city ?? null,
        state: row.state ?? input.state,
        municipalityCode: null,
      }, 3);
    }

    const contractingPages = await Promise.all(COMPRAS_GOV_MODALITIES.map(async (modalityCode) => {
      try {
        return await fetchComprasGovContractings({
          startDate: resultStartDate,
          endDate,
          modalityCode,
          page: 1,
          pageSize: 100,
          state: input.state,
        });
      } catch {
        return { data: [], totalRegistros: 0, totalPaginas: 0, paginasRestantes: 0 };
      }
    }));
    const contractings = contractingPages.flatMap((page) => page.data);
    for (const contracting of contractings) {
      const cnpj = contracting.orgaoEntidade?.cnpj;
      const city = contracting.unidadeOrgao?.municipioNome ?? null;
      const unitCode = contracting.unidadeOrgao?.codigoUnidade?.trim() || null;
      if (!cnpj || (targetCities.size > 0 && !targetCities.has(normalizeText(city)))) continue;
      addBuyer(buyersByKey, {
        cnpj,
        name: contracting.orgaoEntidade?.razaoSocial ?? cnpj,
        unitCode,
        unitName: contracting.unidadeOrgao?.nomeUnidade ?? null,
        city,
        state: contracting.unidadeOrgao?.ufSigla ?? input.state,
        municipalityCode: contracting.unidadeOrgao?.codigoIbge ?? null,
      });
    }

    const selectedBuyers = [...buyersByKey.values()]
      .sort((a, b) => b.hits - a.hits || (a.city ?? "").localeCompare(b.city ?? "", "pt-BR") || a.name.localeCompare(b.name, "pt-BR"))
      .slice(0, input.agencyLimit);
    if (!selectedBuyers.length) throw new Error("Nenhuma unidade compradora foi encontrada no recorte regional informado.");

    const selectedBuyerKeys = new Set(selectedBuyers.map((buyer) => buyerKey(buyer.cnpj, buyer.unitCode)));
    const selectedEntityCnpjs = new Set(selectedBuyers.filter((buyer) => !buyer.unitCode).map((buyer) => buyer.cnpj));
    const contractingsByControl = new Map<string, PncpContracting>();
    for (const contracting of contractings) {
      const control = contracting.numeroControlePNCP;
      const cnpj = normalizeCnpj(contracting.orgaoEntidade?.cnpj);
      const unitCode = contracting.unidadeOrgao?.codigoUnidade?.trim() || null;
      if (!control || !cnpj) continue;
      if (selectedBuyerKeys.has(buyerKey(cnpj, unitCode)) || selectedEntityCnpjs.has(cnpj)) contractingsByControl.set(control, contracting);
    }

    const buyerBatches = await Promise.all(selectedBuyers.map(async (buyer) => {
      const [items, results] = await Promise.all([
        collectItems(input, buyer, itemStartDate, endDate),
        collectResults(input, buyer, resultStartDate, endDate),
      ]);
      return { buyer, items, results };
    }));

    const buyers = selectedBuyers.map((buyer) => ({
      agency_cnpj: buyer.cnpj,
      agency_name: buyer.name,
      unit_name: buyer.unitName,
      uasg: buyer.unitCode,
      city: buyer.city,
      state: buyer.state,
      municipality_code: buyer.municipalityCode,
    }));
    const procurements = new Map<string, ProcurementSeed>();
    const itemsPayload: Record<string, unknown>[] = [];
    const suppliers = new Map<string, Record<string, unknown>>();
    const resultsPayload: Record<string, unknown>[] = [];
    let rawItems = 0;
    let rawResults = 0;

    const ensureProcurement = (key: string, fallbackBuyer: BuyerSeed, sourceUrl: string, sourceUpdatedAt: string | null, rawHash: string | null) => {
      const metadata = contractingForKey(key, contractingsByControl);
      const previous = procurements.get(key);
      const metadataCnpj = normalizeCnpj(metadata?.orgaoEntidade?.cnpj);
      const metadataUnitCode = metadata?.unidadeOrgao?.codigoUnidade?.trim() || null;
      const buyer = metadataCnpj
        ? selectedBuyers.find((candidate) => candidate.cnpj === metadataCnpj && (candidate.unitCode === metadataUnitCode || (!candidate.unitCode && selectedEntityCnpjs.has(metadataCnpj)))) ?? fallbackBuyer
        : fallbackBuyer;
      procurements.set(key, {
        source_key: key,
        source_url: sourceUrl,
        source_updated_at: sourceUpdatedAt ?? previous?.source_updated_at ?? metadata?.dataAtualizacao ?? null,
        raw_hash: rawHash ?? previous?.raw_hash ?? null,
        title: metadata?.objetoCompra?.slice(0, 240) ?? previous?.title ?? null,
        object: metadata?.objetoCompra ?? previous?.object ?? null,
        modality: metadata?.modalidadeNome ?? previous?.modality ?? null,
        process_number: metadata?.processo ?? previous?.process_number ?? null,
        purchase_number: metadata?.numeroCompra ?? previous?.purchase_number ?? null,
        year: metadata?.anoCompra ?? previous?.year ?? null,
        coverage_status: "partial",
        buyer_agency_cnpj: buyer.cnpj,
        buyer_uasg: buyer.unitCode,
        buyer_unit_name: buyer.unitName,
      });
    };

    for (const batch of buyerBatches) {
      rawItems += batch.items.length;
      rawResults += batch.results.length;

      for (const row of batch.items) {
        const normalized = normalizeComprasGovItem(row);
        if (!normalized) continue;
        ensureProcurement(normalized.procurementKey, batch.buyer, normalized.provenance.sourceUrl, normalized.provenance.sourceUpdatedAt, normalized.provenance.rawHash);
        itemsPayload.push({
          source_key: normalized.sourceKey,
          procurement_source_key: normalized.procurementKey,
          item_number: normalized.itemNumber,
          description: normalized.description,
          detailed_description: normalized.detailedDescription,
          material_or_service: normalized.materialOrService,
          catalog_code: normalized.catalogCode,
          class_code: normalized.classCode,
          group_code: normalized.groupCode,
          unit: normalized.unit,
          quantity: normalized.quantity,
          estimated_unit_value: normalized.estimatedUnitValue,
          estimated_total_value: normalized.estimatedTotalValue,
          has_structured_result: normalized.hasStructuredResult,
          source_url: normalized.provenance.sourceUrl,
          source_updated_at: normalized.provenance.sourceUpdatedAt,
          raw_hash: normalized.provenance.rawHash,
        });
      }

      for (const row of batch.results) {
        const normalized = normalizeComprasGovResult(row);
        if (!normalized) continue;
        const procurementKey = procurementKeyFromRaw(row) ?? normalized.result.procurementKey;
        ensureProcurement(procurementKey, batch.buyer, normalized.result.provenance.sourceUrl, normalized.result.provenance.sourceUpdatedAt, normalized.result.provenance.rawHash);
        const supplierSourceKey = normalized.supplier.sourceAliases[0]?.sourceKey;
        if (!supplierSourceKey || !row.idCompraItem) continue;
        suppliers.set(supplierSourceKey, {
          source_key: supplierSourceKey,
          supplier_kind: normalized.supplier.kind,
          normalized_cnpj: normalized.supplier.normalizedCnpj,
          masked_document: normalized.supplier.maskedDocument,
          legal_name: normalized.supplier.legalName,
          trade_name: normalized.supplier.tradeName,
          city: normalized.supplier.city,
          state: normalized.supplier.state,
          main_cnae: normalized.supplier.mainCnae,
          source_url: normalized.result.provenance.sourceUrl,
          source_updated_at: normalized.result.provenance.sourceUpdatedAt,
          raw_hash: normalized.result.provenance.rawHash,
        });
        resultsPayload.push({
          source_key: normalized.result.provenance.sourceKey,
          procurement_source_key: procurementKey,
          item_source_key: row.idCompraItem,
          supplier_source_key: supplierSourceKey,
          homologated_quantity: normalized.result.homologatedQuantity,
          homologated_unit_value: normalized.result.homologatedUnitValue,
          homologated_total_value: normalized.result.homologatedTotalValue,
          discount_percent: normalized.result.discountPercent,
          status: normalized.result.status,
          result_date: normalized.result.resultDate,
          rank: normalized.result.rank,
          source_url: normalized.result.provenance.sourceUrl,
          source_updated_at: normalized.result.provenance.sourceUpdatedAt,
          raw_hash: normalized.result.provenance.rawHash,
        });
      }
    }

    const payload = {
      buyers,
      procurements: [...procurements.values()],
      items: itemsPayload,
      suppliers: [...suppliers.values()],
      results: resultsPayload,
    };
    const { data: persisted, error: persistError } = await supabase.rpc("ingest_market_compras_gov", { p_payload: payload });
    if (persistError) throw persistError;

    await supabase.from("market_ingestion_cursors").upsert({
      source_system: "compras_gov",
      resource: "regional_items_results",
      cursor_key: `${input.state}:${input.cities.map(normalizeText).sort().join("|")}`,
      cursor_value: {
        resultStartDate,
        itemStartDate,
        endDate,
        buyers: selectedBuyers.map((buyer) => ({ cnpj: buyer.cnpj, unitCode: buyer.unitCode, city: buyer.city })),
      },
      coverage_start: resultStartDate,
      coverage_end: endDate,
      updated_at: new Date().toISOString(),
    }, { onConflict: "source_system,resource,cursor_key" });

    const persistedSummary = (persisted ?? {}) as Record<string, number>;
    const failed = persistedSummary.skipped ?? 0;
    await supabase.from("market_ingestion_runs").update({
      status: "completed",
      finished_at: new Date().toISOString(),
      records_seen: rawItems + rawResults,
      inserted_count: (persistedSummary.procurements_inserted ?? 0) + (persistedSummary.suppliers_inserted ?? 0),
      updated_count: (persistedSummary.items_upserted ?? 0) + (persistedSummary.results_upserted ?? 0),
      failed_count: failed,
      error_summary: failed > 0 ? `${failed} registros ignorados por dependência incompleta (normalmente resultado sem item carregado no recorte).` : null,
    }).eq("id", run.id);

    return NextResponse.json({
      scope: { state: input.state, cities: input.cities, resultStartDate, itemStartDate, endDate },
      buyers: selectedBuyers.map(({ cnpj, name, unitCode, unitName, city }) => ({ cnpj, name, unitCode, unitName, city })),
      fetched: { items: rawItems, results: rawResults },
      normalized: { procurements: procurements.size, items: itemsPayload.length, suppliers: suppliers.size, results: resultsPayload.length },
      persisted,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "Falha desconhecida na Inteligência.";
    await supabase.from("market_ingestion_runs").update({
      status: "failed",
      finished_at: new Date().toISOString(),
      failed_count: 1,
      error_summary: message,
    }).eq("id", run.id);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
