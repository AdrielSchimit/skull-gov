export function formatCurrency(value: number | null) {
  if (value === null) return "Não informado";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
}

export function formatDate(value: string | null, includeTime = false) {
  if (!value) return "Não informado";
  return new Intl.DateTimeFormat("pt-BR", includeTime ? { dateStyle: "short", timeStyle: "short" } : { dateStyle: "short" }).format(new Date(value));
}

export function formatCnpj(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 14) return value;
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

export function roleLabel(role: string | null) {
  return ({ skull_admin: "SKULL Admin", gestor: "Gestor", cliente_admin: "Cliente Admin", cliente_user: "Cliente User" } as Record<string, string>)[role ?? ""] ?? "Acesso local";
}
