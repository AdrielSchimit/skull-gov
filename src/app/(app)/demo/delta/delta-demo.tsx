"use client";

import { useMemo, useState } from "react";
import { Check, ChevronRight, CircleDollarSign, MapPin, PackageCheck, Search, Sparkles, X } from "lucide-react";
import styles from "./delta-demo.module.css";

type StockState = "yes" | "no" | null;

type Material = {
  id: number;
  description: string;
  unit: string;
  quantity: string;
};

type Opportunity = {
  id: number;
  city: string;
  distance: number;
  title: string;
  agency: string;
  value: string;
  deadline: string;
  modality: string;
  fit: "Alta" | "Média";
  items: Material[];
};

const opportunities: Opportunity[] = [
  {
    id: 1,
    city: "Sertãozinho/SP",
    distance: 34,
    title: "Registro de preços para aquisição de materiais de construção",
    agency: "Prefeitura Municipal de Sertãozinho",
    value: "R$ 482.600,00",
    deadline: "28/09/2026 09:00",
    modality: "Pregão Eletrônico",
    fit: "Alta",
    items: [
      { id: 1, description: "Cimento CP II 50 kg", unit: "Saco", quantity: "1.000" },
      { id: 2, description: "Areia média lavada", unit: "m³", quantity: "500" },
      { id: 3, description: "Brita nº 1", unit: "m³", quantity: "300" },
      { id: 4, description: "Bloco de concreto 14x19x39 cm", unit: "Unid.", quantity: "2.000" },
      { id: 5, description: "Tijolo cerâmico 8 furos", unit: "Unid.", quantity: "5.000" },
      { id: 6, description: "Telha cerâmica romana", unit: "Unid.", quantity: "1.200" },
      { id: 7, description: "Tinta acrílica 18 L", unit: "Lata", quantity: "200" },
      { id: 8, description: "Tinta esmalte sintético 3,6 L", unit: "Lata", quantity: "150" },
      { id: 9, description: "Massa corrida 25 kg", unit: "Saco", quantity: "400" },
      { id: 10, description: "Rejunte porcelanato 5 kg", unit: "Saco", quantity: "300" },
      { id: 11, description: "Argamassa AC-II 20 kg", unit: "Saco", quantity: "650" },
      { id: 12, description: "Vergalhão CA-50 10 mm", unit: "Barra", quantity: "420" },
    ],
  },
  {
    id: 2,
    city: "Jaboticabal/SP",
    distance: 19,
    title: "Aquisição de materiais hidráulicos, elétricos e de construção civil",
    agency: "Prefeitura Municipal de Jaboticabal",
    value: "R$ 318.450,00",
    deadline: "01/10/2026 09:30",
    modality: "Pregão Eletrônico",
    fit: "Alta",
    items: [
      { id: 1, description: "Tubo PVC soldável 25 mm", unit: "Barra", quantity: "300" },
      { id: 2, description: "Joelho PVC 90º 25 mm", unit: "Unid.", quantity: "800" },
      { id: 3, description: "Cabo flexível 2,5 mm²", unit: "Rolo", quantity: "180" },
      { id: 4, description: "Disjuntor DIN 20 A", unit: "Unid.", quantity: "250" },
      { id: 5, description: "Caixa d'água 500 L", unit: "Unid.", quantity: "25" },
    ],
  },
  {
    id: 3,
    city: "Ribeirão Preto/SP",
    distance: 36,
    title: "Materiais para manutenção predial das unidades municipais",
    agency: "Prefeitura Municipal de Ribeirão Preto",
    value: "R$ 276.900,00",
    deadline: "25/09/2026 10:00",
    modality: "Pregão Eletrônico",
    fit: "Média",
    items: [
      { id: 1, description: "Fechadura externa inox", unit: "Unid.", quantity: "180" },
      { id: 2, description: "Dobradiça 3,5 polegadas", unit: "Unid.", quantity: "600" },
      { id: 3, description: "Silicone neutro 280 g", unit: "Unid.", quantity: "300" },
      { id: 4, description: "Tinta látex premium 18 L", unit: "Lata", quantity: "160" },
    ],
  },
  {
    id: 4,
    city: "Cravinhos/SP",
    distance: 53,
    title: "Aquisição de cimento, areia, brita e blocos para manutenção urbana",
    agency: "Prefeitura Municipal de Cravinhos",
    value: "R$ 89.400,00",
    deadline: "22/09/2026 08:30",
    modality: "Dispensa Eletrônica",
    fit: "Alta",
    items: [
      { id: 1, description: "Cimento CP II 50 kg", unit: "Saco", quantity: "500" },
      { id: 2, description: "Areia grossa", unit: "m³", quantity: "120" },
      { id: 3, description: "Brita nº 1", unit: "m³", quantity: "100" },
      { id: 4, description: "Bloco estrutural 14x19x39 cm", unit: "Unid.", quantity: "1.400" },
    ],
  },
  {
    id: 5,
    city: "Batatais/SP",
    distance: 76,
    title: "Materiais de pintura, ferramentas e EPIs para manutenção pública",
    agency: "Prefeitura Municipal de Batatais",
    value: "R$ 213.750,00",
    deadline: "30/09/2026 09:00",
    modality: "Pregão Eletrônico",
    fit: "Média",
    items: [
      { id: 1, description: "Rolo de pintura lã 23 cm", unit: "Unid.", quantity: "400" },
      { id: 2, description: "Trincha 2 polegadas", unit: "Unid.", quantity: "450" },
      { id: 3, description: "Luva nitrílica reforçada", unit: "Par", quantity: "1.000" },
      { id: 4, description: "Óculos de proteção incolor", unit: "Unid.", quantity: "500" },
    ],
  },
];

export function DeltaDemo() {
  const [selectedId, setSelectedId] = useState(1);
  const [stock, setStock] = useState<Record<string, StockState>>({
    "1-1": "yes", "1-2": "yes", "1-3": "yes", "1-4": "no", "1-5": "yes", "1-6": "yes",
    "1-7": "yes", "1-8": "no", "1-9": "yes", "1-10": "yes",
  });
  const [query, setQuery] = useState("");

  const selected = opportunities.find((item) => item.id === selectedId) ?? opportunities[0];
  const filteredItems = selected.items.filter((item) => item.description.toLowerCase().includes(query.toLowerCase()));

  const stats = useMemo(() => {
    const answers = selected.items.map((item) => stock[`${selected.id}-${item.id}`] ?? null);
    const yes = answers.filter((answer) => answer === "yes").length;
    const no = answers.filter((answer) => answer === "no").length;
    const answered = yes + no;
    return {
      yes,
      no,
      answered,
      percent: answered ? Math.round((yes / answered) * 100) : 0,
    };
  }, [selected, stock]);

  function setItemState(itemId: number, value: Exclude<StockState, null>) {
    setStock((current) => ({ ...current, [`${selected.id}-${itemId}`]: value }));
  }

  function missingList() {
    return selected.items.filter((item) => stock[`${selected.id}-${item.id}`] === "no");
  }

  return (
    <div className={styles.demoShell}>
      <div className={styles.demoBadge}>MODO DEMO · dados ilustrativos</div>

      <section className={styles.hero}>
        <div>
          <span className={styles.kicker}>CLIENTE DEMONSTRAÇÃO</span>
          <h1>Delta Materiais de Construção</h1>
          <p>Oportunidades públicas de materiais de construção em um raio de até 300 km partindo de Barrinha/SP.</p>
          <div className={styles.tags}><span>Construção</span><span>Hidráulica</span><span>Elétrica</span><span>Ferramentas</span><span>Tintas</span><span>EPIs</span></div>
        </div>
        <div className={styles.radiusCard}><MapPin size={19} /><small>Região de atuação</small><strong>Barrinha/SP</strong><span>Raio: 300 km</span></div>
      </section>

      <section className={styles.metrics}>
        <div><Sparkles /><strong>12</strong><span>Novas oportunidades</span><small>últimas 48h</small></div>
        <div><CircleDollarSign /><strong>R$ 2,8 mi</strong><span>Valor total estimado</span><small>neste filtro</small></div>
        <div><MapPin /><strong>9</strong><span>Até 300 km</span><small>da sua região</small></div>
        <div><PackageCheck /><strong>3</strong><span>Recomendadas</span><small>alta aderência</small></div>
      </section>

      <div className={styles.workspace}>
        <aside className={styles.filters}>
          <div className={styles.panelTitle}><strong>Filtros</strong><button>Limpar</button></div>
          <label>Palavra-chave</label>
          <div className={styles.searchBox}><Search size={15} /><input placeholder="Buscar em editais..." /></div>
          <div className={styles.filterTags}><span>material de construção</span><span>obra</span></div>
          <label>Localização</label><div className={styles.fakeInput}>Barrinha/SP</div>
          <label>Raio</label><div className={styles.fakeInput}>300 km</div>
          <label>Situação</label><div className={styles.checkLine}><input type="checkbox" defaultChecked /> Recebendo proposta</div>
          <div className={styles.checkLine}><input type="checkbox" /> Em andamento</div>
          <label>Fontes</label><div className={styles.checkLine}><input type="checkbox" defaultChecked /> PNCP</div>
          <div className={styles.checkLine}><input type="checkbox" defaultChecked /> Compras.gov.br</div>
          <button className={styles.primaryButton}>Aplicar filtros</button>
        </aside>

        <section className={styles.opportunityColumn}>
          <div className={styles.columnHead}><strong>Oportunidades</strong><span>{opportunities.length} demonstrações</span></div>
          {opportunities.map((opportunity) => (
            <button key={opportunity.id} className={`${styles.opportunityCard} ${selected.id === opportunity.id ? styles.selected : ""}`} onClick={() => { setSelectedId(opportunity.id); setQuery(""); }}>
              <div className={styles.cardTop}><span>{opportunity.modality}</span><b>{opportunity.value}</b></div>
              <strong>{opportunity.title}</strong>
              <small>{opportunity.agency}</small>
              <div className={styles.cardBottom}><span><MapPin size={12} /> {opportunity.city} · {opportunity.distance} km</span><em className={opportunity.fit === "Alta" ? styles.highFit : styles.mediumFit}>{opportunity.fit} aderência</em><ChevronRight size={16} /></div>
            </button>
          ))}
        </section>

        <section className={styles.detail}>
          <div className={styles.detailHead}>
            <div><span>{selected.modality}</span><h2>{selected.title}</h2><p>{selected.agency} · {selected.city}</p></div>
            <div className={styles.valueBox}><small>Valor estimado</small><strong>{selected.value}</strong><span>Encerra {selected.deadline}</span></div>
          </div>

          <div className={styles.tabs}><strong>Lista de materiais</strong><span>Requisitos</span><span>Documentos</span><span>Histórico</span></div>
          <div className={styles.infoStrip}>Marque o que a Delta consegue fornecer na quantidade pedida. O percentual abaixo é recalculado automaticamente.</div>
          <div className={styles.itemsTools}><div className={styles.searchBox}><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar item na lista..." /></div><span>{selected.items.length} itens</span></div>

          <div className={styles.tableWrap}>
            <table>
              <thead><tr><th>Item</th><th>Descrição</th><th>Unidade</th><th>Quantidade</th><th>Tenho?</th></tr></thead>
              <tbody>{filteredItems.map((item) => {
                const state = stock[`${selected.id}-${item.id}`] ?? null;
                return <tr key={item.id}><td>{item.id}</td><td>{item.description}</td><td>{item.unit}</td><td>{item.quantity}</td><td><div className={styles.stockButtons}>
                  <button aria-pressed={state === "yes"} className={state === "yes" ? styles.stockYesActive : ""} onClick={() => setItemState(item.id, "yes")}><Check size={13} /> Tenho</button>
                  <button aria-pressed={state === "no"} className={state === "no" ? styles.stockNoActive : ""} onClick={() => setItemState(item.id, "no")}><X size={13} /> Não tenho</button>
                </div></td></tr>;
              })}</tbody>
            </table>
          </div>

          <div className={styles.compatibility}>
            <div><span><strong>{stats.percent}%</strong> compatibilidade declarada</span><small>{stats.yes} tenho · {stats.no} não tenho · {selected.items.length - stats.answered} sem resposta</small></div>
            <div className={styles.progress}><i style={{ width: `${stats.percent}%` }} /></div>
          </div>

          <div className={styles.recommendation}><Sparkles size={19} /><div><strong>{stats.percent >= 70 ? "Boa oportunidade para analisar" : "Complete a análise de estoque"}</strong><span>{stats.percent >= 70 ? "A empresa declarou capacidade para a maior parte dos itens respondidos." : "Marque os itens para saber se a contratação cabe na operação."}</span></div></div>

          <div className={styles.actions}><button className={styles.secondaryButton}>Salvar análise</button><button className={styles.primaryButton} onClick={() => alert(missingList().length ? `Itens faltantes: ${missingList().map((item) => item.description).join(", ")}` : "Nenhum item marcado como faltante.")}>Gerar lista de faltas</button></div>
        </section>
      </div>
    </div>
  );
}
