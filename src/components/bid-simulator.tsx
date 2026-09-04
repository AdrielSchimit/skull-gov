"use client";

import { CheckCircle2, CircleDollarSign, Gavel, RotateCcw, ShieldCheck, Sparkles, StopCircle, TrendingDown } from "lucide-react";
import { useMemo, useState } from "react";
import styles from "./bid-simulator.module.css";

export type BidScenario = {
  id: string;
  object: string;
  agency: string;
  modality: string;
  estimatedValue: number | null;
  pncpUrl?: string | null;
};

type Phase = "preparacao" | "disputa" | "negociacao" | "habilitacao" | "resultado";

type LogEntry = { id: number; actor: "SKULL" | "Concorrente" | "Sistema"; text: string };

function brl(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

function startingValues(scenario: BidScenario) {
  const reference = scenario.estimatedValue && scenario.estimatedValue > 0 ? scenario.estimatedValue : 10_000;
  const initial = Math.max(100, Math.round(reference * 0.92 * 100) / 100);
  const cost = Math.max(50, Math.round(initial * 0.7 * 100) / 100);
  const floor = Math.max(cost, Math.round(initial * 0.82 * 100) / 100);
  const decrement = Math.max(1, Math.round(initial * 0.005 * 100) / 100);
  return { initial, cost, floor, decrement };
}

export function BidSimulator({ scenarios }: { scenarios: BidScenario[] }) {
  const safeScenarios = scenarios.length ? scenarios : [{ id: "treino", object: "Cenário genérico de pregão eletrônico para treinamento", agency: "Ambiente de treinamento", modality: "Pregão eletrônico", estimatedValue: 10_000 }];
  const [scenarioId, setScenarioId] = useState(safeScenarios[0].id);
  const scenario = safeScenarios.find((item) => item.id === scenarioId) ?? safeScenarios[0];
  const defaults = useMemo(() => startingValues(scenario), [scenario]);

  const [phase, setPhase] = useState<Phase>("preparacao");
  const [initialProposal, setInitialProposal] = useState(defaults.initial);
  const [cost, setCost] = useState(defaults.cost);
  const [floor, setFloor] = useState(defaults.floor);
  const [decrement, setDecrement] = useState(defaults.decrement);
  const [bestBid, setBestBid] = useState<number | null>(null);
  const [myBid, setMyBid] = useState<number | null>(null);
  const [round, setRound] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [checks, setChecks] = useState({ sicaf: false, identity: false, certificates: false, proposal: false });

  function addLog(actor: LogEntry["actor"], text: string) {
    setLogs((current) => [{ id: Date.now() + Math.random(), actor, text }, ...current].slice(0, 18));
  }

  function reset(nextScenario = scenario) {
    const next = startingValues(nextScenario);
    setPhase("preparacao");
    setInitialProposal(next.initial);
    setCost(next.cost);
    setFloor(next.floor);
    setDecrement(next.decrement);
    setBestBid(null);
    setMyBid(null);
    setRound(0);
    setLogs([]);
    setChecks({ sicaf: false, identity: false, certificates: false, proposal: false });
  }

  function changeScenario(id: string) {
    const next = safeScenarios.find((item) => item.id === id) ?? safeScenarios[0];
    setScenarioId(id);
    reset(next);
  }

  function start() {
    if (floor < cost) {
      addLog("Sistema", "Piso bloqueado: ele está abaixo do custo informado. Corrija antes de iniciar.");
      return;
    }
    if (initialProposal <= floor) {
      addLog("Sistema", "A proposta inicial precisa ficar acima do piso absoluto para o treino fazer sentido.");
      return;
    }
    setPhase("disputa");
    setMyBid(initialProposal);
    setBestBid(initialProposal);
    setRound(1);
    addLog("Sistema", "Sessão simulada iniciada. Nenhuma informação foi enviada a qualquer portal público.");
    addLog("SKULL", `Proposta inicial registrada no simulador: ${brl(initialProposal)}.`);
  }

  function competitorBid(forceBelowFloor = false) {
    if (phase !== "disputa" || bestBid === null) return;
    const normalReduction = decrement * (1 + (round % 3));
    const next = forceBelowFloor ? Math.max(0.01, floor - Math.max(decrement, floor * 0.01)) : Math.max(0.01, bestBid - normalReduction);
    setBestBid(next);
    setRound((value) => value + 1);
    addLog("Concorrente", `Novo menor lance: ${brl(next)}.`);
    if (next < floor) addLog("Sistema", `O concorrente cruzou seu piso de ${brl(floor)}. Recomendação: PARAR e preservar margem.`);
  }

  const recommended = bestBid === null ? null : Math.max(floor, bestBid - decrement);
  const canBid = phase === "disputa" && bestBid !== null && bestBid > floor && recommended !== null && recommended < bestBid;
  const margin = myBid && myBid > 0 ? ((myBid - cost) / myBid) * 100 : 0;

  function placeRecommendedBid() {
    if (!canBid || recommended === null) {
      addLog("Sistema", `Novo lance bloqueado. O próximo valor violaria ou encostaria no piso de ${brl(floor)}.`);
      return;
    }
    setMyBid(recommended);
    setBestBid(recommended);
    setRound((value) => value + 1);
    addLog("SKULL", `Lance SIMULADO registrado: ${brl(recommended)}.`);
  }

  function finishBidding() {
    if (phase !== "disputa") return;
    setPhase("negociacao");
    if (bestBid !== null && myBid !== null && myBid <= bestBid) addLog("Sistema", "Você terminou a disputa como melhor lance do cenário. Agora vem negociação/aceitação.");
    else addLog("Sistema", "Você encerrou sem cobrir o menor preço. No treino, isso representa uma perda natural sem descumprir obrigação real.");
  }

  function advanceToQualification() {
    setPhase("habilitacao");
    addLog("Sistema", "Preço/negociação simulados concluídos. O pregoeiro agora verificaria habilitação e documentos.");
  }

  const allChecks = Object.values(checks).every(Boolean);

  function conclude() {
    if (!allChecks) return;
    setPhase("resultado");
    addLog("Sistema", "Treino concluído. Você percorreu proposta, disputa, negociação e habilitação sem enviar qualquer lance real.");
  }

  const phaseLabel: Record<Phase, string> = {
    preparacao: "1. Preparação",
    disputa: "2. Disputa",
    negociacao: "3. Negociação",
    habilitacao: "4. Habilitação",
    resultado: "5. Resultado",
  };

  return <div className={styles.layout}>
    <section className={styles.main}>
      <div className={styles.safety}><ShieldCheck size={20} /><div><strong>MODO TREINO</strong><span>Nenhum botão desta página envia proposta, mensagem, documento ou lance para Compras.gov, PNCP ou qualquer portal.</span></div></div>

      <div className={styles.phasebar}>{(Object.keys(phaseLabel) as Phase[]).map((item) => <span key={item} className={item === phase ? styles.activePhase : undefined}>{phaseLabel[item]}</span>)}</div>

      <div className={styles.card}>
        <div className={styles.cardHead}><div><span className={styles.kicker}>CENÁRIO</span><h2>{scenario.object}</h2><p>{scenario.agency} · {scenario.modality}</p></div><button className={styles.iconButton} onClick={() => reset()} title="Reiniciar"><RotateCcw size={18} /></button></div>
        <label className={styles.field}><span>Trocar oportunidade de referência</span><select value={scenarioId} onChange={(event) => changeScenario(event.target.value)} disabled={phase !== "preparacao"}>{safeScenarios.map((item) => <option value={item.id} key={item.id}>{item.agency} — {item.object.slice(0, 72)}</option>)}</select></label>
      </div>

      {phase === "preparacao" && <div className={styles.card}>
        <div className={styles.cardTitle}><CircleDollarSign size={20} /><div><h3>Estratégia antes da sessão</h3><p>Defina o limite antes de sentir a pressão dos lances.</p></div></div>
        <div className={styles.grid4}>
          <label className={styles.field}><span>Proposta inicial</span><input type="number" min="0" step="0.01" value={initialProposal} onChange={(e) => setInitialProposal(Number(e.target.value))} /></label>
          <label className={styles.field}><span>Seu custo estimado</span><input type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(Number(e.target.value))} /></label>
          <label className={styles.field}><span>Piso absoluto</span><input type="number" min="0" step="0.01" value={floor} onChange={(e) => setFloor(Number(e.target.value))} /></label>
          <label className={styles.field}><span>Decremento por lance</span><input type="number" min="0.01" step="0.01" value={decrement} onChange={(e) => setDecrement(Number(e.target.value))} /></label>
        </div>
        <div className={styles.guardrail}><strong>Regra SKULL:</strong> o simulador bloqueia estratégia com piso abaixo do custo. Em disputa real, o piso deve considerar impostos, deslocamento, operação e risco.</div>
        <button className="button button-green" onClick={start}><Gavel size={17} />Iniciar sessão simulada</button>
      </div>}

      {phase === "disputa" && <div className={styles.card}>
        <div className={styles.auctionTop}>
          <div><span className={styles.kicker}>MENOR LANCE ATUAL</span><strong className={styles.best}>{brl(bestBid ?? initialProposal)}</strong></div>
          <div><span className={styles.kicker}>MEU PISO</span><strong>{brl(floor)}</strong></div>
          <div><span className={styles.kicker}>MEU ÚLTIMO LANCE</span><strong>{brl(myBid ?? initialProposal)}</strong></div>
          <div><span className={styles.kicker}>MARGEM SIMULADA</span><strong>{margin.toFixed(1)}%</strong></div>
        </div>
        <div className={styles.recommendation}><Sparkles size={19} /><div><span>Próxima ação</span><strong>{bestBid !== null && bestBid <= floor ? "PARAR — mercado abaixo do piso" : recommended ? `Lance sugerido: ${brl(recommended)}` : "Aguardar"}</strong></div></div>
        <div className={styles.actions}>
          <button className="button button-green" onClick={placeRecommendedBid} disabled={!canBid}><TrendingDown size={17} />Dar lance simulado</button>
          <button className="button button-secondary" onClick={() => competitorBid(false)}>Concorrente dá lance</button>
          <button className="button button-secondary" onClick={() => competitorBid(true)}><StopCircle size={17} />Simular concorrente abaixo do meu piso</button>
          <button className="button button-primary" onClick={finishBidding}>Encerrar disputa simulada</button>
        </div>
      </div>}

      {phase === "negociacao" && <div className={styles.card}>
        <div className={styles.cardTitle}><Gavel size={20} /><div><h3>Negociação / aceitação</h3><p>Depois dos lances, ainda pode existir negociação com o pregoeiro e análise da proposta.</p></div></div>
        <div className={styles.summary}><span>Seu último lance <strong>{brl(myBid ?? initialProposal)}</strong></span><span>Piso definido <strong>{brl(floor)}</strong></span><span>Menor preço do cenário <strong>{brl(bestBid ?? initialProposal)}</strong></span></div>
        <div className={styles.guardrail}>No mundo real, nunca aceite negociação abaixo do valor que você consegue cumprir. O treino mantém seu piso visível justamente para evitar decisão por impulso.</div>
        <button className="button button-green" onClick={advanceToQualification}>Avançar para habilitação</button>
      </div>}

      {phase === "habilitacao" && <div className={styles.card}>
        <div className={styles.cardTitle}><ShieldCheck size={20} /><div><h3>Checklist de habilitação</h3><p>Marque como se o pregoeiro estivesse conferindo sua documentação.</p></div></div>
        <div className={styles.checks}>
          {[
            ["sicaf", "SICAF / credenciamento compatível com o edital"],
            ["identity", "CPF/CNPJ e identificação regular"],
            ["certificates", "Certidões e documentos de habilitação válidos"],
            ["proposal", "Proposta, declarações e anexos exigidos enviados"],
          ].map(([key, label]) => <label key={key}><input type="checkbox" checked={checks[key as keyof typeof checks]} onChange={(e) => setChecks((value) => ({ ...value, [key]: e.target.checked }))} /><CheckCircle2 size={18} /><span>{label}</span></label>)}
        </div>
        <button className="button button-green" disabled={!allChecks} onClick={conclude}>Concluir treinamento</button>
      </div>}

      {phase === "resultado" && <div className={`${styles.card} ${styles.result}`}><CheckCircle2 size={34} /><div><span className={styles.kicker}>TREINO CONCLUÍDO</span><h3>Agora você já viu o fluxo sem precisar “perder de propósito” numa disputa real.</h3><p>Repita alterando piso, custo e comportamento dos concorrentes. Depois podemos acrescentar chat do pregoeiro, tempo randômico, intenção de recurso e envio de documentos simulado.</p></div><button className="button button-primary" onClick={() => reset()}>Treinar novamente</button></div>}
    </section>

    <aside className={styles.side}>
      <div className={styles.card}><span className={styles.kicker}>REFERÊNCIA</span><h3>{scenario.estimatedValue ? brl(scenario.estimatedValue) : "Valor não informado"}</h3><p>Valor estimado da oportunidade usada como contexto. Os lances e concorrentes desta tela são fictícios.</p>{scenario.pncpUrl && <a className="button button-secondary" href={scenario.pncpUrl} target="_blank" rel="noreferrer">Abrir oportunidade real</a>}</div>
      <div className={styles.card}><span className={styles.kicker}>LOG DA SESSÃO</span><div className={styles.log}>{logs.length ? logs.map((entry) => <div key={entry.id}><strong>{entry.actor}</strong><span>{entry.text}</span></div>) : <p>A sessão ainda não começou.</p>}</div></div>
    </aside>
  </div>;
}
