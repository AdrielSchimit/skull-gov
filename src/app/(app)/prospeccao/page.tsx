import { ArrowRight, MapPin, Search, Store, Target } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProspectSyncButton } from "@/components/prospect-sync-button";
import { DataError, EmptyState, OpportunityCard, PageHeader } from "@/components/ui";
import { getLatestSync } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { getProspectingOpportunities, PROSPECTING_PROFILES, type ProspectingProfileKey } from "@/lib/prospecting";
import { getSessionContext } from "@/lib/session-context";

export const metadata = { title: "Prospecção" };

const allowedRadii = [100, 180, 220, 250, 300];

export default async function ProspectingPage({ searchParams }: { searchParams: Promise<{ niche?: string; radius?: string }> }) {
  const session = await getSessionContext();
  if (!session.userId) redirect("/login");
  if (session.role !== "skull_admin") redirect("/dashboard");

  const params = await searchParams;
  const requested = params.niche as ProspectingProfileKey | undefined;
  const nicheKey: ProspectingProfileKey = requested && requested in PROSPECTING_PROFILES ? requested : "food_retail";
  const niche = PROSPECTING_PROFILES[nicheKey];
  const parsedRadius = Number(params.radius);
  const radius = allowedRadii.includes(parsedRadius) ? parsedRadius : niche.defaultRadius;
  const [result, sync] = await Promise.all([getProspectingOpportunities(nicheKey, radius), getLatestSync()]);

  return <>
    <PageHeader
      eyebrow="MODO GESTOR · PROSPECÇÃO"
      title="Chegue no comércio já mostrando dinheiro público na mesa."
      description="Escolha o nicho do prospect, atualize PNCP + Compras.gov e mostre somente oportunidades abertas dentro do raio de Barrinha. Esta tela é exclusiva da gestão SKULL."
      action={<ProspectSyncButton />}
    />

    <div className="content-stack">
      <section className="panel prospect-hero">
        <div>
          <span className="eyebrow">DEMONSTRAÇÃO AO VIVO</span>
          <h2>{niche.label}</h2>
          <p>{niche.description} O filtro atual considera oportunidades com distância calculada de até <strong>{radius} km de Barrinha/SP</strong>.</p>
        </div>
        <div className="prospect-count"><strong>{result.count}</strong><span>abertas compatíveis</span></div>
      </section>

      <form className="panel prospect-controls" method="get">
        <label><span>Nicho do comércio</span><select name="niche" defaultValue={nicheKey}>
          {Object.entries(PROSPECTING_PROFILES).map(([key, profile]) => <option value={key} key={key}>{profile.label}</option>)}
        </select></label>
        <label><span>Raio a partir de Barrinha</span><select name="radius" defaultValue={String(radius)}>
          {allowedRadii.map((km) => <option value={km} key={km}>{km} km</option>)}
        </select></label>
        <button className="button button-primary" type="submit"><Search size={16} />Aplicar perfil</button>
      </form>

      <div className="prospect-script">
        <Store size={18} />
        <div><strong>Roteiro de abordagem</strong><p>“Vocês já vendem para prefeitura, Estado ou outros órgãos? Eu desenvolvi uma plataforma que encontra oportunidades públicas compatíveis com o que vocês já vendem. Olha o que está aberto agora perto daqui.”</p></div>
      </div>

      {sync && <section className="panel"><div className="sync-stats">
        <span>Última consulta <strong>{formatDate(sync.finished_at ?? sync.started_at, true)}</strong></span>
        <span>Status <strong>{sync.status}</strong></span>
        <span>Encontradas <strong>{sync.found_count}</strong></span>
        <span>Novas <strong>{sync.inserted_count}</strong></span>
        <span>Atualizadas <strong>{sync.updated_count}</strong></span>
      </div></section>}

      {result.error && <DataError message={result.error} />}

      <div className="section-heading"><div><h2>Oportunidades para mostrar ao prospect</h2><p>Dados públicos já ingeridos das fontes oficiais. Clique no card para abrir detalhes, edital, itens e a futura análise da SKULL IA.</p></div><span className="filter-pill active"><MapPin size={14} />até {radius} km</span></div>

      {result.data.length ? <div className="opportunity-list">{result.data.map((opportunity) => <OpportunityCard key={opportunity.id} opportunity={opportunity} />)}</div> : <EmptyState title="Ainda não apareceu lead nesse recorte" description="Clique em “Buscar oportunidades agora”. O SKULL GOV consulta PNCP e Compras.gov; se nenhuma contratação aberta corresponder ao nicho e raio, não inventamos resultado." />}

      <section className="panel prospect-next-step"><Target size={20} /><div><strong>Gostou da demonstração?</strong><p>O próximo passo é cadastrar o CNPJ do comércio. O sistema identifica CNAEs, cria o tenant e monta o Radar exclusivo daquele cliente.</p></div><Link className="button button-secondary" href="/cadastro">Pré-cadastrar cliente <ArrowRight size={16} /></Link></section>
    </div>
  </>;
}
