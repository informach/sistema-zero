import type { StudyDuration, StudyGrantView } from '@sistemazero/member-shell/lib/study-access'

/**
 * Apresentação das autorizações de aparelho na área dos pais. Puro (sem DOM): a régua do
 * estado de cada acesso, a prévia da data de término e o resumo por criança moram aqui para o
 * painel, o cartão da criança e o guia lerem a MESMA conta.
 */

const DAY_MS = 86_400_000
/** "Vence em breve" a partir de 7 dias do fim (especificação, tela 5). */
export const EXPIRING_SOON_MS = 7 * DAY_MS
/**
 * Prazo CURTO por escolha: "Somente hoje" (até a meia-noite) e 7 dias. Com a régua de 7 dias eles
 * nasciam "Vence em breve" e caíam em "Precisa da sua atenção" pedindo renovação, o contrário do
 * conselho de usar "Somente hoje" num aparelho emprestado (full review de 11/10/2026).
 */
const SHORT_GRANT_MS = 7 * DAY_MS + 60 * 60_000

export type GrantState = 'active' | 'expiring' | 'expired' | 'revoked'
export const GRANT_STATE_LABEL: Record<GrantState, string> = {
  active: 'Liberado',
  expiring: 'Vence em breve',
  expired: 'Vencido',
  revoked: 'Encerrado',
}

type GrantDates = Pick<StudyGrantView, 'expiresAt' | 'revokedAt' | 'createdAt'>

/**
 * A janela do "Vence em breve": 7 dias para os prazos longos; o último dia para o de 7 dias;
 * nenhuma para o "Somente hoje", que termina por escolha. Sem a data de criação (Auth antigo),
 * vale a régua de 7 dias de sempre. Renovar não muda a criação, então um prazo renovado conta
 * como longo.
 */
function expiringWindow(grant: GrantDates, end: number): number {
  const created = grant.createdAt ? new Date(grant.createdAt).getTime() : Number.NaN
  if (!Number.isFinite(created)) return EXPIRING_SOON_MS
  const total = end - created
  if (total <= DAY_MS) return 0
  return total <= SHORT_GRANT_MS ? DAY_MS : EXPIRING_SOON_MS
}

export function grantState(grant: GrantDates, now = Date.now()): GrantState {
  if (grant.revokedAt) return 'revoked'
  const end = new Date(grant.expiresAt).getTime()
  if (!(end > now)) return 'expired'
  return end - now <= expiringWindow(grant, end) ? 'expiring' : 'active'
}

/** Ainda deixa a criança entrar (inclusive a que vence em breve). */
export function grantIsLive(grant: GrantDates, now = Date.now()): boolean {
  const state = grantState(grant, now)
  return state === 'active' || state === 'expiring'
}

/**
 * Prévia do fim do acesso, espelho de `studyAccessExpiresAt` do Auth (travado por
 * `tests/study-access-view.test.ts`). Só mostra: quem grava a data é o servidor. "Somente hoje"
 * termina à meia-noite de São Paulo; os outros prazos contam dias a partir de agora.
 */
export function studyAccessEndPreview(days: StudyDuration, now = new Date()): Date {
  if (days !== 0) return new Date(now.getTime() + days * DAY_MS)
  const local = new Date(now.getTime() - 3 * 3_600_000)
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1, 3))
}

const SAO_PAULO = 'America/Sao_Paulo'

export function formatAccessDate(value: Date | string): string {
  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: SAO_PAULO,
  })
}

/**
 * O fim de um acesso como o responsável entende: "08 de jan. de 2027". O "Somente hoje" termina
 * à 00h00 de São Paulo do dia SEGUINTE, e dizer a data do dia seguinte faria parecer um dia a
 * mais; por isso ele vira "10 de out. de 2026, à meia-noite".
 */
export function formatAccessEnd(value: Date | string): string {
  const end = new Date(value)
  const time = end.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: SAO_PAULO,
  })
  return time === '00:00'
    ? `${formatAccessDate(new Date(end.getTime() - 60_000))}, à meia-noite`
    : formatAccessDate(end)
}

/** Prévia para "Termina …" antes de confirmar: "hoje, à meia-noite" ou "em 08 de jan. de 2027". */
export function accessEndPreviewPhrase(days: StudyDuration, now = new Date()): string {
  return days === 0
    ? 'hoje, à meia-noite'
    : `em ${formatAccessDate(studyAccessEndPreview(days, now))}`
}

/**
 * O que o cartão da criança diz sobre os aparelhos dela. `unknown` = a consulta falhou: o
 * cartão cala em vez de afirmar que não há acesso (o mesmo cuidado do "progresso
 * desconhecido ≠ nada feito").
 */
export type ChildAccessSummary =
  | { kind: 'unknown' }
  | { kind: 'none' }
  | { kind: 'expired' }
  | { kind: 'ready'; live: number }
  | { kind: 'expiring'; live: number; label: string; expiresAt: string }

export function childAccessSummary(
  grants: readonly StudyGrantView[] | null | undefined,
  now = Date.now(),
): ChildAccessSummary {
  if (!grants) return { kind: 'unknown' }
  const live = grants.filter((grant) => grantIsLive(grant, now))
  const soon = live
    .filter((grant) => grantState(grant, now) === 'expiring')
    .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime())[0]
  if (soon)
    return { kind: 'expiring', live: live.length, label: soon.label, expiresAt: soon.expiresAt }
  if (live.length) return { kind: 'ready', live: live.length }
  return grants.some((grant) => grantState(grant, now) === 'expired')
    ? { kind: 'expired' }
    : { kind: 'none' }
}

/**
 * O acesso da família está preparado? Basta UMA autorização viva em qualquer criança: é o
 * passo que o guia dos pais espera. `null` = não dá para saber (alguma consulta falhou e
 * nenhuma das outras achou acesso vivo), e aí o guia não pede para preparar o que talvez exista.
 */
export function familyAccessReady(
  grantsByProfile: Readonly<Record<string, readonly StudyGrantView[] | null>>,
  now = Date.now(),
): boolean | null {
  const all = Object.values(grantsByProfile)
  if (all.some((grants) => grants?.some((grant) => grantIsLive(grant, now)))) return true
  return all.some((grants) => grants === null) ? null : false
}
