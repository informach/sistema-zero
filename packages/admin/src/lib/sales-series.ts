/**
 * Série do painel "Gestão de vendas" — lógica PURA (sem `server-only`, sem I/O):
 * densificação da série esparsa do payments, agregação semana/mês e saneamento
 * da janela. Unit-testada via bun test; o adapter `server/payments.ts` orquestra.
 */
import type { DailyPaymentBucket, DailyPaymentStats, SalesGranularity } from './types'

/** Mesmo fuso do bucket no payments — o calendário denso precisa casar. */
const REPORT_TZ = 'America/Sao_Paulo'
export const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Janela máxima aceita (DoS de densificação: `to=9999-12-31` geraria milhões de
 * buckets). 750 dias cobre o filtro de 12 meses da UI com folga ampla.
 */
export const MAX_WINDOW_DAYS = 750

// en-CA → YYYY-MM-DD (chave lexicograficamente ordenável).
const dayFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: REPORT_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/**
 * Saneia a janela vinda da query (input de admin, mas ainda input): `to` no
 * máximo amanhã, `from ≤ to` e span ≤ `MAX_WINDOW_DAYS` (corta pelo lado do
 * `from` — o presente importa mais que o passado distante).
 */
export function clampWindow(from: Date, to: Date, now = new Date()): { from: Date; to: Date } {
  const toMs = Math.min(to.getTime(), now.getTime() + DAY_MS)
  let fromMs = Math.min(from.getTime(), toMs)
  fromMs = Math.max(fromMs, toMs - MAX_WINDOW_DAYS * DAY_MS)
  return { from: new Date(fromMs), to: new Date(toMs) }
}

function zeroBucket(day: string): DailyPaymentBucket {
  return {
    day,
    grossAmountInCents: '0',
    refundedAmountInCents: '0',
    netAmountInCents: '0',
    transactions: 0,
    cancellations: 0,
  }
}

/**
 * Densifica a série: o payments devolve buckets esparsos (só dias com movimento);
 * aqui geramos TODOS os dias civis (BRT) da janela, com zeros nos vazios, e
 * somamos os totais do período (BigInt — os valores são bigint serializado).
 */
export function densify(from: Date, to: Date, sparse: DailyPaymentBucket[]): DailyPaymentStats {
  const byDay = new Map(sparse.map((b) => [b.day, b]))
  const days: DailyPaymentBucket[] = []
  const lastKey = dayFmt.format(to)
  // Passos de 24h são seguros: o Brasil não tem mais horário de verão (UTC-3 fixo).
  for (let t = from.getTime(); ; t += DAY_MS) {
    const key = dayFmt.format(new Date(t))
    if (days.length === 0 || days[days.length - 1]?.day !== key) {
      days.push(byDay.get(key) ?? zeroBucket(key))
    }
    if (key >= lastKey) break
  }

  let gross = 0n
  let refunded = 0n
  let transactions = 0
  let cancellations = 0
  for (const b of days) {
    gross += BigInt(b.grossAmountInCents)
    refunded += BigInt(b.refundedAmountInCents)
    transactions += b.transactions
    cancellations += b.cancellations
  }

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    granularity: 'day',
    days,
    totals: {
      netAmountInCents: (gross - refunded).toString(),
      grossAmountInCents: gross.toString(),
      refundedAmountInCents: refunded.toString(),
      transactions,
      cancellations,
    },
  }
}

/** Janela longa → buckets maiores p/ o gráfico ficar legível (>90d semana, >270d mês). */
export function pickGranularity(from: Date, to: Date): SalesGranularity {
  const spanDays = Math.round((to.getTime() - from.getTime()) / DAY_MS)
  if (spanDays > 270) return 'month'
  if (spanDays > 90) return 'week'
  return 'day'
}

/**
 * Início do bucket de um rótulo `YYYY-MM-DD`. A conta é UTC-pura sobre o RÓTULO
 * de dia civil (que já saiu do `dayFmt` em BRT) — sem reconversão de fuso.
 */
export function bucketStart(day: string, g: SalesGranularity): string {
  if (g === 'month') return `${day.slice(0, 7)}-01`
  // Semana começa na segunda-feira (getUTCDay: 0=dom … 6=sáb).
  const d = new Date(`${day}T00:00:00Z`)
  const offset = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - offset)
  return d.toISOString().slice(0, 10)
}

/**
 * Agrega a série DENSA diária em buckets semanais/mensais. Valores monetários
 * são bigint serializado → soma via BigInt. `day` = início do bucket;
 * `periodEnd` = último dia coberto (p/ o tooltip mostrar o intervalo).
 * Os `totals` do período não mudam (já somados sobre os dias densos).
 */
export function aggregate(days: DailyPaymentBucket[], g: SalesGranularity): DailyPaymentBucket[] {
  if (g === 'day') return days
  const out: DailyPaymentBucket[] = []
  let current: DailyPaymentBucket | null = null
  let gross = 0n
  let refunded = 0n
  const flush = () => {
    if (!current) return
    current.grossAmountInCents = gross.toString()
    current.refundedAmountInCents = refunded.toString()
    current.netAmountInCents = (gross - refunded).toString()
    out.push(current)
  }
  for (const b of days) {
    const key = bucketStart(b.day, g)
    if (!current || current.day !== key) {
      flush()
      current = { ...zeroBucket(key), periodEnd: b.day }
      gross = 0n
      refunded = 0n
    }
    gross += BigInt(b.grossAmountInCents)
    refunded += BigInt(b.refundedAmountInCents)
    current.transactions += b.transactions
    current.cancellations += b.cancellations
    current.periodEnd = b.day
  }
  flush()
  return out
}

/** Densifica e, em janela longa, agrega (semana/mês) — os totais não mudam. */
export function buildStats(from: Date, to: Date, sparse: DailyPaymentBucket[]): DailyPaymentStats {
  const stats = densify(from, to, sparse)
  const granularity = pickGranularity(from, to)
  return { ...stats, granularity, days: aggregate(stats.days, granularity) }
}
