"use client";

import { useMemo, useState } from "react";
import { Check, ExternalLink, MapPin, PackageCheck, Search, ShieldCheck, Sparkles, X } from "lucide-react";
import styles from "./delta-demo.module.css";

type StockState = "yes" | "no" | null;

export type DeltaMaterial = {
  id: number;
  description: string;
  unit: string;
  quantity: number | null;
  unitValue: number | null;
  totalValue: number | null;
  benefit: string | null;
};

export type DeltaOpportunity = {
  id: string;
  pncpControl: string;
  purchase: string;
  city: string;
  distance: number;
  title: string;
  agency: string;
  deadline: string;
  publishedAt: string;
  modality: string;
  source: string;
  sourceUrl: string;
  officialNoticeUrl: string;
  totalItems: number;
  value: number | null;
  benefit: string;
  fit: "Muito alta" | "Alta" | "Média";
  itemsAvailable: boolean;
  items: DeltaMaterial[];
};

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 4 });
const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

export function DeltaDemo({ opportunities }: { opportunities: DeltaOpportunity[] }) {
  const [selectedId, setSelectedId] = useState(opportunities[0]?.id ?? "");
  const [stock, setStock] = useState<Record<string, StockState>>({});
  const [query, setQuery] = useState("");

  const selected = opportunities.find((item) => item.id === selectedId) ?? opportunities[0];
  const filteredItems = selected?.items.filter((item) => item.description.toLowerCase().includes(query.toLowerCase())) ?? [];

  const stats = useMemo(() => {
    if (!selected) return { yes: 0, no: 0, answered: 0, percent: 0 };
    const answers = selected.items.map((item) => stock[`${selected.id}-${item.id}`] ?? null);
    const yes = answers.filter((answer) => answer === "yes").length;
    const no = answers.filter((answer) => answer === "no").length;
    const answered = yes + no;
    return { yes, no, answered, percent: answered ? Math.round((yes / answered) * 100) : 0 };
  }, [selected, stock]);

  const totalItems = opportunities.reduce((sum, opportunity) => sum + opportunity.totalItems, 0);
  const loadedItems = opportunities.reduce((sum, opportunity) => sum + opportunity.items.length, 0);

  function setItemState(itemId: number, value: Exclude<StockState, null>) {
    if (!selected) return;
    setStock((current) => ({ ...current, [`${selected.id}-${itemId}`]: value }));
  }

  if (!selected) {
    return <div className={styles.empty}><strong>Nenhuma oportunidade real foi carregada.</strong><span>O sistema não cria dados fictícios quando as fontes públicas estão indisponíveis.</span></div>;
  }

  return (
    <div className={styles.shell}>
      <section className={styles.hero}>
        <div>
          <div className={styles.liveBadge}><ShieldCheck size={15} /> DADOS PÚBLICOS REAIS</div>
          <p className={styles.eyebrow}>PERFIL DE DEMONSTRAÇÃO · DELTA MATERIAIS DE CONSTRUÇÃO</p>
          <h1>O que o poder público está comprando perto da Delta?</h1>
          <p className={styles.heroCopy}>Radar configurado para materiais de construção, hidráulica, madeira, aço, ferragens e correlatos em até 300 km de Barrinha/SP.</p>
        </div>
        <div className={styles.radiusCard}><MapPin size={20} /><span>Base</span><strong>Barrinha/SP</strong><small>Raio operacional: 300 km</small></div>
      </section>

      <section className={styles.metrics}>
        <div><strong>{opportunities.length}</strong><span>oportunidades reais abertas</span><small>validadas para esta apresentação</small></div>
        <div><strong>{totalItems}</strong><span>itens publicados</span><small>somados nas contratações abaixo</small></div>
        <div><strong>{loadedItems}</strong><span>itens carregados agora</span><small>direto da API oficial do PNCP</small></div>
        <div><strong>300 km</strong><span>raio do cliente</span><small>partindo de Barrinha/SP</small></div>
      </section>

      <section className={styles.workspace}>
        <div className={styles.listPane}>
          <div className={styles.paneTitle}><div><span>RADAR DO CLIENTE</span><strong>Oportunidades compatíveis</strong></div><PackageCheck size={20} /></div>
          <div className={styles.cards}>
            {opportunities.map((opportunity) => (
              <button key={opportunity.id} onClick={() => { setSelectedId(opportunity.id); setQuery(""); }} className={`${styles.card} ${selected.id === opportunity.id ? styles.cardActive : ""}`}>
                <div className={styles.cardTop}><span>{opportunity.purchase}</span><b>{opportunity.fit} aderência</b></div>
                <strong>{opportunity.title}</strong>
                <small>{opportunity.agency}</small>
                <div className={styles.cardMeta}><span><MapPin size={13} /> {opportunity.city} · ~{opportunity.distance} km em linha reta</span><span>{opportunity.totalItems} itens</span></div>
                <div className={styles.deadline}>Propostas até <strong>{date.format(new Date(opportunity.deadline))}</strong></div>
              </button>
            ))}
          </div>
          <div className={styles.sourceNote}>Somente processos reais. O perfil Delta é demonstrativo; os editais, prazos, números de controle e itens são públicos.</div>
        </div>

        <div className={styles.detailPane}>
          <div className={styles.detailHeader}>
            <div>
              <div className={styles.detailTags}><span>{selected.modality}</span><span>{selected.source}</span></div>
              <h2>{selected.title}</h2>
              <p>{selected.agency}</p>
            </div>
            <a className={styles.externalButton} href={selected.sourceUrl} target="_blank" rel="noreferrer">Abrir no PNCP <ExternalLink size={15} /></a>
          </div>

          <div className={styles.facts}>
            <div><span>Município</span><strong>{selected.city}</strong></div>
            <div><span>Prazo</span><strong>{date.format(new Date(selected.deadline))}</strong></div>
            <div><span>Itens</span><strong>{selected.totalItems}</strong></div>
            <div><span>Valor</span><strong>{selected.value === null ? "Não publicado" : money.format(selected.value)}</strong></div>
            <div><span>ME/EPP</span><strong>{selected.benefit}</strong></div>
            <div><span>Controle PNCP</span><strong className={styles.mono}>{selected.pncpControl}</strong></div>
          </div>

          <div className={styles.sectionHead}>
            <div><span>CONFERÊNCIA DE ESTOQUE</span><h3>A Delta consegue fornecer?</h3></div>
            <div className={styles.search}><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar item..." /></div>
          </div>

          {!selected.itemsAvailable ? (
            <div className={styles.apiWarning}><strong>Itens temporariamente indisponíveis na API oficial.</strong><span>O processo continua real e o sistema não substituiu a lista por dados inventados. Use “Abrir no PNCP” para consultar o edital enquanto a API se recupera.</span></div>
          ) : (
            <div className={styles.items}>
              {filteredItems.map((item) => {
                const state = stock[`${selected.id}-${item.id}`] ?? null;
                return (
                  <div className={styles.itemRow} key={item.id}>
                    <div className={styles.itemNumber}>{item.id}</div>
                    <div className={styles.itemDescription}><strong>{item.description}</strong><span>{item.unit} · Quantidade {item.quantity === null ? "não informada" : number.format(item.quantity)}{item.unitValue !== null ? ` · ${money.format(item.unitValue)}/un.` : ""}</span></div>
                    <div className={styles.stockButtons}>
                      <button className={state === "yes" ? styles.yesActive : ""} onClick={() => setItemState(item.id, "yes")}><Check size={14} /> Tenho</button>
                      <button className={state === "no" ? styles.noActive : ""} onClick={() => setItemState(item.id, "no")}><X size={14} /> Não tenho</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className={styles.bottomBar}>
            <div className={styles.compatibility}>
              <div><Sparkles size={18} /><span><strong>{stats.percent}%</strong> dos itens respondidos podem ser atendidos</span></div>
              <small>{stats.yes} tenho · {stats.no} não tenho · {selected.items.length - stats.answered} sem resposta</small>
              <div className={styles.progress}><i style={{ width: `${stats.percent}%` }} /></div>
            </div>
            <a className={styles.primaryButton} href={selected.officialNoticeUrl} target="_blank" rel="noreferrer">Ver publicação oficial <ExternalLink size={15} /></a>
          </div>
        </div>
      </section>
    </div>
  );
}
