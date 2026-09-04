import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/ui";

export default function OpportunityNotFound() {
  return <><PageHeader eyebrow="404" title="Oportunidade não encontrada." description="Ela pode ter sido removida, ou sua empresa não possui acesso pelo RLS." /><div className="content-stack"><EmptyState title="Registro indisponível" description="Volte à lista para escolher uma oportunidade visível à sua conta." /><Link className="button button-secondary" href="/oportunidades">Voltar às oportunidades</Link></div></>;
}
