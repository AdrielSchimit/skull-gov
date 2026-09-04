export function canParseOfficialHistoricalDocument(input: {
  procurementStatus: string | null;
  sourceUrl: string | null;
  isPubliclyAccessible: boolean;
}) {
  const status = input.procurementStatus?.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase() ?? "";
  const closed = ["encerr", "homolog", "adjudic", "conclu", "finaliz"].some((token) => status.includes(token));
  if (!input.sourceUrl || !input.isPubliclyAccessible) return { allowed: false, reason: "Documento sem URL publica oficial acessivel." };
  if (!closed) return { allowed: false, reason: "Parser documental permitido apenas para processo encerrado, homologado ou equivalente." };
  return { allowed: true, reason: null };
}

