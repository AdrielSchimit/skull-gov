import { EmptyState, PageHeader } from "@/components/ui";

export default function CompanyNotFound() {
  return <><PageHeader eyebrow="404" title="Empresa não encontrada." description="O RLS pode ter bloqueado o registro para esta conta." /><div className="content-stack"><EmptyState title="Perfil indisponível" description="Volte à carteira para escolher uma empresa acessível." href="/empresas" action="Voltar às empresas" /></div></>;
}
