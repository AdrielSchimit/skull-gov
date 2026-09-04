"use client";

import {
  Bell, BriefcaseBusiness, Building2, DraftingCompass, FileStack, Gauge, Handshake, Radar, Settings2, Store, UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/lib/types";

const baseLinks = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/radar", label: "Radar", icon: Radar },
  { href: "/oportunidades", label: "Oportunidades", icon: BriefcaseBusiness },
  { href: "/documentos", label: "Documentos", icon: FileStack },
  { href: "/participacoes", label: "Participações", icon: UsersRound },
  { href: "/alertas", label: "Alertas", icon: Bell },
  { href: "/configuracoes", label: "Configurações", icon: Settings2 },
];

const adminLinks = [
  { href: "/prospeccao", label: "Prospectar clientes", icon: Handshake },
  { href: "/arquitetura", label: "Arquitetura & Urbanismo", icon: DraftingCompass },
  { href: "/empresas", label: "Empresas", icon: Building2 },
  { href: "/demo/delta", label: "Demo Delta", icon: Store },
];

export function NavLinks({ mobile = false, role }: { mobile?: boolean; role?: UserRole | null }) {
  const pathname = usePathname();
  const links = role === "skull_admin"
    ? [baseLinks[0], baseLinks[1], baseLinks[2], ...adminLinks, ...baseLinks.slice(3)]
    : baseLinks;
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
