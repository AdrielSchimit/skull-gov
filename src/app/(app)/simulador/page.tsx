import { redirect } from "next/navigation";
import { BidSimulator } from "@/components/bid-simulator";
import { PageHeader } from "@/components/ui";
import { getCompanyAwareOpportunities } from "@/lib/client-opportunities";
import { getSessionContext } from "@/lib/session-context";

export const metadata = { title: "Simulador de Pregão" };

export default async function SimulatorPage() {
  const session = await getSessionContext();
  if (!session.userId) redirect("/login");
  if (session.role !== "skull_admin") redirect("/dashboard");

  const result = await getCompanyAwareOpportunities({ page: 1, pageSize: 8 });
  const scenarios = result.data.map((item) => ({
    id: item.id,
    object: item.object,
    agency: item.agency_name,
    modality: item.modality,
    estimatedValue: item.estimated_value,
    pncpUrl: item.pncp_url,
  }));

  return <>
    <PageHeader
      eyebrow="MODO TREINO"
      title="Simulador de Pregão Eletrônico"
      description="Treine proposta, piso, lances, negociação e habilitação usando oportunidades reais apenas como contexto. Nenhuma ação desta tela é transmitida a um portal de compras."
    />
    <div className="content-stack">
      <BidSimulator scenarios={scenarios} />
    </div>
  </>;
}
