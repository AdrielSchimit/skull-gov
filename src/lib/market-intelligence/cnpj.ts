export function normalizeCnpj(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 14) return null;
  if (/^(\d)\1{13}$/.test(digits)) return null;
  return digits;
}

export function maskBrazilianDocument(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length === 14) return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  if (digits.length === 11) return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
  return null;
}

export function supplierKeyFromDocument(kind: string | null | undefined, value: string | null | undefined): string | null {
  const normalizedKind = (kind ?? "").toUpperCase();
  if (normalizedKind === "PJ") {
    const cnpj = normalizeCnpj(value);
    return cnpj ? `pj:${cnpj}` : null;
  }
  if (normalizedKind === "PF") {
    return value ? `pf:${maskBrazilianDocument(value) ?? "masked"}` : null;
  }
  return value ? `unknown:${value.replace(/\s+/g, "").toLowerCase()}` : null;
}

