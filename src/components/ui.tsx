import { AlertTriangle, ArrowUpRight, DatabaseZap, Search } from "lucide-react";
import Link from "next/link";
import type { Opportunity, Recommendation } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <header className="page-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action && <div className="page-action">{action}</div>}</header>;
}

export function SetupNotice() {
  return <div className="setup-notice"><DatabaseZap size={19} aria-hidden="true" /><div><strong>Conecte o Supabase para começar</strong><span>Preencha as duas variáveis públicas e aplique o schema de <code>SUPABASE_REQUIREMENTS.md</code>.</span></div></div>;
}

export function DataError({ message }: { message: string }) {
  return <div className="error-notice" role="alert"><AlertTriangle size={19} /><div><strong>Os dados não puderam ser carregados</strong><span>{message}</span></div></div>;
}

export function EmptyState({ title, description, href, action }: { title: string; description: string; href?: string; action?: string }) {
  return <div className="empty-state"><span className="empty-icon"><Search size={22} /></span><h2>{title}</h2><p>{description}</p>{href && action && <Link className="button button-secondary" href={href}>{action}<ArrowUpRight size={16} /></Link>}</div>;
}

export function RecommendationBadge({ value }: { value: Recommendation }) {
  return <span className={`decision decision-${value}`}><i aria-hidden="true" />{value.toUpperCase()}</span>;
}

export function ScoreGauge({ score, label = "SKULL Score" }: { score: number; label?: string }) {
  return <div className="score-gauge" style={{ "--score": `${score * 3.6}deg` } as React.CSSProperties}><span><strong>{score}</strong><small>{label}</small></span></div>;
}

export function OpportunityCard({ opportunity }: { opportunity: Opportunity }) {
  return (
    <article className="opportunity-card">
      <div className="card-topline"><RecommendationBadge value={opportunity.recommendation} /><span>{opportunity.city}/{opportunity.state}{opportunity.distance_km !== null ? ` · ${opportunity.distance_km} km` : ""}</span></div>
      <div className="opportunity-main">
        <div><span className="agency">{opportunity.agency_name}</span><h2>{opportunity.object}</h2></div>
        <ScoreGauge score={opportunity.skull_score} />
      </div>
      <div className="opportunity-meta">
        <span><small>Valor estimado</small><strong>{formatCurrency(opportunity.estimated_value)}</strong></span>
        <span><small>Encerramento</small><strong>{formatDate(opportunity.closes_at, true)}</strong></span>
        <span><small>Capital</small><strong className={`capital-${opportunity.working_capital}`}>{opportunity.working_capital.toUpperCase()}</strong></span>
      </div>
      <Link className="card-link" href={`/oportunidades/${opportunity.id}`}>Abrir análise <ArrowUpRight size={16} /></Link>
    </article>
  );
}
