/**
 * O funil do Pensa v2 no painel de IA (15/10/2026): onde as crianças param na PRIMEIRA versão dos
 * jogos criados no período. Espelho do `PensaFunnelView` do members. Só números: o texto das
 * crianças nunca sai do banco.
 */
export interface PensaFunnelView {
  days: number
  since: string
  games: number
  told: number
  asked: number
  questions: number
  answeredByChoice: number
  answeredAny: number
  answeredTyped: number
  waitingOnQuestion: number
  proposal: number
  accepted: number
  firstMission: number
  tested: number
  versionDone: number
}

export const PENSA_FUNNEL_PERIODS = [7, 30, 90] as const
export type PensaFunnelPeriod = (typeof PENSA_FUNNEL_PERIODS)[number]

export function isPensaFunnelPeriod(value: unknown): value is PensaFunnelPeriod {
  return PENSA_FUNNEL_PERIODS.includes(value as PensaFunnelPeriod)
}

export interface PensaFunnelStage {
  key: 'games' | 'told' | 'proposal' | 'accepted' | 'firstMission' | 'tested' | 'versionDone'
  label: string
  count: number
  /** Parte dos jogos criados (0 a 100, inteiro); `null` sem jogos. */
  ofGames: number | null
  /** Quantos ficaram entre a etapa anterior e esta. */
  lost: number
}

const STAGES: ReadonlyArray<{ key: PensaFunnelStage['key']; label: string }> = [
  { key: 'games', label: 'Começaram um jogo' },
  { key: 'told', label: 'Contaram a ideia' },
  { key: 'proposal', label: 'Receberam um começo' },
  { key: 'accepted', label: 'Escolheram o começo' },
  { key: 'firstMission', label: 'Concluíram a primeira missão' },
  { key: 'tested', label: 'Testaram o jogo' },
  { key: 'versionDone', label: 'Guardaram a versão pronta' },
]

function percent(part: number, whole: number): number | null {
  return whole > 0 ? Math.round((part / whole) * 100) : null
}

/** As etapas na ordem da criança, com a parte dos jogos e quantos ficaram desde a anterior. */
export function pensaFunnelStages(view: PensaFunnelView): PensaFunnelStage[] {
  let previous = view.games
  return STAGES.map((stage) => {
    const count = view[stage.key]
    const lost = Math.max(0, previous - count)
    previous = count
    return {
      ...stage,
      count,
      ofGames: percent(count, view.games),
      lost,
    }
  })
}

export interface PensaFunnelAnswers {
  questions: number
  /** Jogos que receberam ao menos uma pergunta, em % dos que contaram a ideia. */
  askedOfTold: number | null
  rows: { key: string; label: string; count: number; ofQuestions: number | null }[]
}

/** Como as perguntas do Zappy foram respondidas. */
export function pensaFunnelAnswers(view: PensaFunnelView): PensaFunnelAnswers {
  const rows = [
    { key: 'byChoice', label: 'Tocaram numa resposta pronta', count: view.answeredByChoice },
    { key: 'any', label: 'Tanto faz, escolhe você', count: view.answeredAny },
    { key: 'typed', label: 'Responderam do jeito delas', count: view.answeredTyped },
    { key: 'waiting', label: 'Pararam na pergunta', count: view.waitingOnQuestion },
  ]
  return {
    questions: view.questions,
    askedOfTold: percent(view.asked, view.told),
    rows: rows.map((row) => ({ ...row, ofQuestions: percent(row.count, view.questions) })),
  }
}
