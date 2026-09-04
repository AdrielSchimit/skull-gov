import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/dashboard" className="brand" aria-label="SKULL GOV — início">
      <span className="brand-mark" aria-hidden="true">S</span>
      {!compact && <span className="brand-type"><strong>SKULL</strong><small>GOV</small></span>}
    </Link>
  );
}
