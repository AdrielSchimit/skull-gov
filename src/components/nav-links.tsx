"use client";

import {
  Bell, BriefcaseBusiness, Building2, FileStack, Gauge, Radar, Settings2, UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/radar", label: "Radar", icon: Radar },
  { href: "/oportunidades", label: "Oportunidades", icon: BriefcaseBusiness },
  { href: "/empresas", label: "Empresas", icon: Building2 },
  { href: "/documentos", label: "Documentos", icon: FileStack },
  { href: "/participacoes", label: "Participações", icon: UsersRound },
  { href: "/alertas", label: "Alertas", icon: Bell },
  { href: "/configuracoes", label: "Configurações", icon: Settings2 },
];

export function NavLinks({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const visible = mobile ? links.slice(0, 4) : links;
  return (
    <nav className={mobile ? "mobile-nav-links" : "nav-links"} aria-label="Navegação principal">
      {visible.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link href={href} key={href} className={active ? "nav-link active" : "nav-link"} aria-current={active ? "page" : undefined}>
            <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
