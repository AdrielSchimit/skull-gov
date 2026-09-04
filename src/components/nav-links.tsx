"use client";

import {
  Bell, BriefcaseBusiness, Building2, DraftingCompass, FileStack, Gamepad2, Gauge, Handshake, Radar, Settings2, Store, UsersRound,
  BrainCircuit,
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

const prospectLink = { href: "/prospeccao", label: "Prospectar clientes", icon: Handshake };
const simulatorLink = { href: "/simulador", label: "Simulador de Pregão", icon: Gamepad2 };

const adminLinks = [
  { href: "/inteligencia", label: "Inteligência GOV", icon: BrainCircuit },
  prospectLink,
  simulatorLink,
  { href: "/arquitetura", label: "Arquitetura & Urbanismo", icon: DraftingCompass },
  { href: "/empresas", label: "Empresas", icon: Building2 },
  { href: "/demo/delta", label: "Demo Delta", icon: Store },
];

export function NavLinks({ mobile = false, role }: { mobile?: boolean; role?: UserRole | null }) {
  const pathname = usePathname();
  const links = role === "skull_admin"
    ? [baseLinks[0], baseLinks[1], baseLinks[2], ...adminLinks, ...baseLinks.slice(3)]
    : baseLinks;
  const visible = mobile
    ? role === "skull_admin"
      ? [baseLinks[0], baseLinks[1], prospectLink, simulatorLink]
      : links.slice(0, 4)
    : links;
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
