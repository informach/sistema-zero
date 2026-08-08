/**
 * Quanto ainda resta da ajuda de IA — a MESMA forma que o members devolve.
 *
 * A quota é da CONTA (a família): os perfis das crianças dividem o mesmo bolso.
 * Por isso a copy sempre menciona a família — a criança que fica sem porque o
 * irmão usou precisa entender o que aconteceu, senão parece castigo ou defeito.
 */
export interface AiCreditsView {
  dayLimit: number
  dayRemaining: number
  monthLimit: number
  monthRemaining: number
  /** Data civil de São Paulo em que o MÊS vira (`YYYY-MM-DD`). */
  monthRenewsOn: string
  /** Equipe: sem teto. */
  unlimited?: boolean
}

export type AiCreditsScope = 'day' | 'month'

/**
 * `unknown` NÃO é erro: é "não deu para saber" (members fora, deploy em skew,
 * fail-open da quota). Quem renderiza deve ESCONDER o medidor nesse estado —
 * ausência de dado jamais pode virar "0 restantes" na tela da criança.
 */
export type AiCreditsState = 'plenty' | 'low' | 'exhausted' | 'unlimited' | 'unknown'

export interface AiCreditsMeter {
  state: AiCreditsState
  /** Qual teto está mordendo primeiro. Ausente em `unlimited`/`unknown`. */
  scope?: AiCreditsScope
  remaining: number
  /** Linha curta do medidor: `✨ 13 ideias hoje` / `⚠️ Só 2 ideias hoje!`. */
  inline: string
  /** Rótulo do grupo para leitor de tela (inclui a menção à família). */
  ariaLabel: string
  /** Aviso longo do "acabou" — só faz sentido em `exhausted`. */
  exhausted: string
  /** Linha de "quando volta", para o rodapé do campo. */
  renews: string
}

/**
 * Pisos do "está acabando". Percentual sozinho não serve: com o teto diário de 50
 * daria 5, mas se um dia a conta tiver teto 10 daria 1 — tarde demais para avisar.
 */
export const AI_CREDITS_LOW_DAY = 5
export const AI_CREDITS_LOW_MONTH = 25

export function aiCreditsLowThreshold(scope: AiCreditsScope, limit: number): number {
  return scope === 'day'
    ? Math.max(AI_CREDITS_LOW_DAY, Math.ceil(limit * 0.1))
    : Math.max(AI_CREDITS_LOW_MONTH, Math.ceil(limit * 0.05))
}

function isView(value: unknown): value is AiCreditsView {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.dayRemaining === 'number' &&
    typeof v.monthRemaining === 'number' &&
    typeof v.dayLimit === 'number' &&
    typeof v.monthLimit === 'number'
  )
}

/**
 * Qual teto manda na copy.
 *
 * ⚠️ No EMPATE vence o MÊS, e isso é deliberado: com 3 no dia e 3 no mês, dizer
 * "amanhã tem mais" seria mentira. Diverge de propósito do `scope` da RECUSA do
 * servidor, que espelha a ordem de checagem do repositório (dia antes de mês) —
 * aquele descreve qual portão bateu, este descreve o que a criança precisa saber.
 */
function bindingScope(view: AiCreditsView): AiCreditsScope {
  return view.monthRemaining <= view.dayRemaining ? 'month' : 'day'
}

const IDEIAS = (n: number) => (n === 1 ? 'ideia' : 'ideias')

const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

/**
 * `'2026-09-01'` → `'1º de setembro'`.
 *
 * ⚠️ Recebe a data CIVIL já resolvida em São Paulo pelo servidor, e formata
 * string→string. NUNCA derive isto de um instante ISO no browser: aplicaria o
 * fuso do aparelho e mostraria o dia errado para quem está fora do Brasil.
 */
export function diaCivilPorExtenso(civil: string): string {
  const [, mes, dia] = civil.split('-')
  const d = Number(dia)
  const nome = MESES[Number(mes) - 1] ?? ''
  return `${d === 1 ? '1º' : d} de ${nome}`
}

function quandoVolta(view: AiCreditsView, scope: AiCreditsScope): string {
  return scope === 'day'
    ? 'Amanhã de manhã tem mais.'
    : `Tem mais no dia ${diaCivilPorExtenso(view.monthRenewsOn)}.`
}

export function resolveAiCredits(view: AiCreditsView | null | undefined): AiCreditsMeter {
  if (!isView(view)) {
    return {
      state: 'unknown',
      remaining: 0,
      inline: '',
      ariaLabel: '',
      exhausted: '',
      renews: '',
    }
  }
  if (view.unlimited) {
    return {
      state: 'unlimited',
      remaining: Number.POSITIVE_INFINITY,
      inline: '✨ ideias sem limite',
      ariaLabel: 'Ajuda do Zappy: ideias sem limite.',
      exhausted: '',
      renews: '',
    }
  }

  const scope = bindingScope(view)
  const remaining = scope === 'month' ? view.monthRemaining : view.dayRemaining
  const limit = scope === 'month' ? view.monthLimit : view.dayLimit
  const quando = scope === 'day' ? 'hoje' : 'este mês'
  const volta = quandoVolta(view, scope)

  if (remaining <= 0) {
    const titulo = scope === 'day' ? 'As ideias de hoje acabaram' : 'As ideias deste mês acabaram'
    const maisTarde =
      scope === 'day'
        ? 'Amanhã de manhã tem mais ✨'
        : `No dia ${diaCivilPorExtenso(view.monthRenewsOn)} tem mais ✨`
    return {
      state: 'exhausted',
      scope,
      remaining: 0,
      inline: `⚠️ ${titulo}`,
      ariaLabel: `Ajuda do Zappy: ${titulo.toLowerCase()}. ${volta}`,
      exhausted: `${titulo}! Elas são de toda a família, vocês dividem. ${maisTarde}`,
      renews: volta,
    }
  }

  const low = remaining <= aiCreditsLowThreshold(scope, limit)
  const contagem = `${remaining} ${IDEIAS(remaining)} ${quando}`
  return {
    state: low ? 'low' : 'plenty',
    scope,
    remaining,
    inline: low ? `⚠️ Só ${contagem}! ${volta}` : `✨ ${contagem}`,
    ariaLabel: `Ajuda do Zappy: ${contagem}. As ideias são de toda a família.`,
    exhausted: '',
    renews: volta,
  }
}

/** Duck-typing: o erro atravessa pacotes que não compartilham a classe. */
export function isAiQuotaError(cause: unknown): boolean {
  return (
    typeof cause === 'object' &&
    cause !== null &&
    (cause as { code?: unknown }).code === 'AI_QUOTA_EXCEEDED'
  )
}

export function aiQuotaScopeOf(cause: unknown): AiCreditsScope {
  const scope = (cause as { scope?: unknown } | null)?.scope
  return scope === 'month' ? 'month' : 'day'
}
