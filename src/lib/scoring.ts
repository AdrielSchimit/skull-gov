import type { OpportunityRequirements, Recommendation, WorkingCapital } from "@/lib/types";

const POSITIVE_TERMS = [
  "software", "sistema", "site", "portal", "aplicativo", "dashboard", "automacao",
  "integracao", "api", "saas", "hospedagem", "cloud", "suporte", "manutencao de sistema",
  "desenvolvimento", "digitalizacao", "painel", "plataforma web", "inteligencia artificial",
];
const NEGATIVE_TERMS = [
  "hardware", "computador", "notebook", "impressora", "toner", "switch", "roteador",
  "camera", "servidor fisico", "mobiliario", "estoque", "material", "equipamento", "pecas",
];
const PHYSICAL_TERMS = ["presencial", "visita tecnica", "no local", "posto de trabalho"];
const QUALIFICATION_TERMS = ["atestado de capacidade", "certificacao", "prova de conceito", "registro profissional"];
const WARRANTY_TERMS = ["garantia contratual", "seguro garantia", "caucao"];

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function matches(text: string, terms: string[]) {
  return terms.filter((term) => text.includes(term));
}

export interface ScoreInput {
  object: string;
  estimatedValue: number | null;
  distanceKm: number | null;
  closesAt: string | null;
  modality: string;
  disputeMode: string | null;
  smallBusinessExclusive?: boolean | null;
}

export interface ScoreResult {
  skullScore: number;
  payRisk: number | null;
  competitionRisk: number;
  workingCapital: WorkingCapital;
  recommendation: Recommendation;
  remoteExecution: boolean;
  explanation: string[];
  requirements: OpportunityRequirements;
}

function classifyWorkingCapital(text: string, positive: string[], negative: string[]): WorkingCapital {
  const merchandise = matches(text, ["fornecimento", "aquisicao", "mercadoria"]);
  if (negative.length >= 2 && merchandise.length > 0) return "critico";
  if (negative.length >= 2) return "alto";
  if (negative.length === 1 && positive.length > 0) return "medio";
  return positive.length > 0 ? "baixo" : "medio";
}

export function scoreOpportunity(input: ScoreInput): ScoreResult {
  const text = normalize(input.object);
  const positive = matches(text, POSITIVE_TERMS);
  const negative = matches(text, NEGATIVE_TERMS);
  const physical = matches(text, PHYSICAL_TERMS);
  const qualification = matches(text, QUALIFICATION_TERMS);
  const warranty = matches(text, WARRANTY_TERMS);
  const remoteExecution = positive.length > 0 && physical.length === 0;
  const workingCapital = classifyWorkingCapital(text, positive, negative);
  const explanation: string[] = [];

  let score = Math.min(30, positive.length * 7) - Math.min(20, negative.length * 7);
  explanation.push(positive.length > 0 ? `+${Math.min(30, positive.length * 7)} aderência técnica (${positive.slice(0, 3).join(", ")})` : "+0 aderência técnica não confirmada pelo objeto");

  const capitalPoints = workingCapital === "baixo" ? 15 : workingCapital === "medio" ? 8 : workingCapital === "alto" ? 2 : 0;
  score += capitalPoints;
  explanation.push(`+${capitalPoints} capital de giro ${workingCapital}`);

  const distancePoints = input.distanceKm === null ? (remoteExecution ? 6 : 2) : input.distanceKm <= 50 ? 10 : input.distanceKm <= 100 ? 8 : input.distanceKm <= 200 ? 5 : remoteExecution ? 4 : 0;
  score += distancePoints;
  explanation.push(input.distanceKm === null ? `+${distancePoints} distância ainda não catalogada${remoteExecution ? ", com sinais de execução remota" : ""}` : `+${distancePoints} município a ${input.distanceKm} km`);

  const valuePoints = input.estimatedValue === null ? 4 : input.estimatedValue >= 5_000 && input.estimatedValue <= 200_000 ? 10 : input.estimatedValue < 500_000 ? 6 : 2;
  score += valuePoints;
  explanation.push(`+${valuePoints} valor ${input.estimatedValue === null ? "não informado" : "compatível com a faixa inicial"}`);

  const qualificationPoints = qualification.length === 0 ? 10 : qualification.length === 1 ? 5 : 2;
  score += qualificationPoints;
  explanation.push(`+${qualificationPoints} barreira de habilitação ${qualification.length === 0 ? "não identificada no objeto" : "a confirmar no edital"}`);

  const daysRemaining = input.closesAt ? Math.ceil((new Date(input.closesAt).getTime() - Date.now()) / 86_400_000) : null;
  const deadlinePoints = daysRemaining === null ? 2 : daysRemaining >= 15 ? 5 : daysRemaining >= 7 ? 3 : daysRemaining > 0 ? 1 : 0;
  score += deadlinePoints;
  explanation.push(`+${deadlinePoints} prazo ${daysRemaining === null ? "não informado" : `${Math.max(0, daysRemaining)} dias restantes`}`);

  const smallBusinessPoints = input.smallBusinessExclusive === true ? 5 : 2;
  score += smallBusinessPoints;
  explanation.push(`+${smallBusinessPoints} tratamento ME/EPP ${input.smallBusinessExclusive === true ? "indicado" : "a confirmar"}`);

  let competitionRisk = 45;
  const modality = normalize(input.modality);
  const dispute = normalize(input.disputeMode ?? "");
  if (modality.includes("pregao") && dispute.includes("eletronico")) competitionRisk += 25;
  if (modality.includes("dispensa")) competitionRisk -= 12;
  if ((input.estimatedValue ?? 0) > 500_000) competitionRisk += 12;
  if (positive.length >= 3) competitionRisk -= 8;
  if (daysRemaining !== null && daysRemaining < 5) competitionRisk -= 5;
  competitionRisk = Math.max(0, Math.min(100, competitionRisk));
  const competitionPoints = competitionRisk <= 35 ? 5 : competitionRisk <= 60 ? 3 : 1;
  score += competitionPoints;
  explanation.push(`+${competitionPoints} concorrência estimada em ${competitionRisk}/100`);

  const payRisk = null;
  score += 2;
  explanation.push("+2 risco de pagamento: dados públicos insuficientes");

  const complexityPoints = physical.length === 0 && warranty.length === 0 ? 5 : physical.length + warranty.length === 1 ? 3 : 1;
  score += complexityPoints;
  explanation.push(`+${complexityPoints} complexidade de execução`);

  score = Math.max(0, Math.min(100, Math.round(score)));
  const recommendation: Recommendation = score >= 70 && workingCapital === "baixo" ? "atacar" : score >= 45 && workingCapital !== "critico" ? "analisar" : "evitar";

  return {
    skullScore: score,
    payRisk,
    competitionRisk,
    workingCapital,
    recommendation,
    remoteExecution,
    explanation,
    requirements: {
      technicalFit: positive.length > 0 ? `Aderência identificada: ${positive.join(", ")}.` : "Revisar o objeto e o termo de referência.",
      qualification: qualification.length > 0 ? "Há sinais de exigência técnica; conferir o edital." : "Nenhuma exigência específica foi confirmada no resumo público.",
      certificates: qualification.length > 0 ? "Atestados ou certificações podem ser exigidos." : "Conferir certidões e anexos do edital.",
      team: text.includes("equipe") ? "O objeto menciona equipe dedicada." : "Dimensionamento depende do termo de referência.",
      physicalPresence: physical.length > 0 ? "Há sinais de presença física." : "Sem sinal de presença física no objeto público.",
      warranty: warranty.length > 0 ? "Há sinal de garantia; validar percentual no edital." : "Garantia não confirmada no resumo público.",
      sla: text.includes("sla") || text.includes("nivel de servico") ? "SLA mencionado; revisar penalidades." : "SLA não identificado no resumo público.",
      implementation: daysRemaining !== null && daysRemaining >= 15 ? "Prazo de proposta permite preparação inicial." : "Prazo de implantação deve ser confirmado no edital.",
      smallBusiness: input.smallBusinessExclusive === true ? "Benefício ME/EPP indicado no PNCP." : "Tratamento ME/EPP a confirmar nos documentos.",
      checklist: [
        { label: "Software/serviço compatível", met: positive.length > 0 },
        { label: "CNPJ ativo", met: null },
        { label: "CNAE compatível", met: null },
        { label: "Atestado semelhante", met: qualification.length === 0 ? null : false },
        { label: "Certidões válidas", met: null },
      ],
    },
  };
}

export function isQuickCash(opportunity: Pick<ScoreResult, "skullScore" | "workingCapital" | "remoteExecution"> & Pick<ScoreInput, "estimatedValue" | "distanceKm">) {
  return opportunity.skullScore >= 70 && opportunity.workingCapital === "baixo" && (opportunity.estimatedValue ?? 0) >= 5_000 && (opportunity.estimatedValue ?? Infinity) <= 200_000 && (opportunity.remoteExecution || (opportunity.distanceKm !== null && opportunity.distanceKm <= 200));
}
