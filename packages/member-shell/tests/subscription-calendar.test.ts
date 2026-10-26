import { expect, test } from 'bun:test'
import {
  type MySubscriptionView,
  nextChargeDate,
  paidSubscriptionPeriodRunning,
} from '../src/lib/subscription-card'

const now = new Date('2026-10-24T12:00:00.000Z')
const subscription = (overrides: Partial<MySubscriptionView> = {}): MySubscriptionView => ({
  id: 'qa-subscription',
  status: 'ACTIVE',
  intervalMonths: 1,
  repeats: null,
  amountInCents: '9700',
  currency: 'BRL',
  card: { brand: 'visa', last4: '4242' },
  cyclesCompleted: 2,
  lastChargeAt: now.toISOString(),
  createdAt: '2026-01-31T12:00:00.000Z',
  description: 'Assinatura QA',
  canceledAt: null,
  pendingOperation: null,
  billing: {
    nextExecution: '2026-11-16',
    scheduleObservedAt: now.toISOString(),
    paidPeriod: { startsAt: '2026-10-16T12:00:00.000Z', endsAt: '2026-11-16T12:00:00.000Z' },
  },
  ...overrides,
})

test('pagamento atrasado não desloca próxima data nem estende período pago cancelado', () => {
  const sub = subscription()
  const date = nextChargeDate(sub, now)
  expect(date?.toISOString()).toBe('2026-11-16T12:00:00.000Z')
  if (!date) throw new Error('Expected provider date')
  expect(new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(date)).toBe(
    '16/11/2026',
  )
  sub.status = 'CANCELED'
  sub.lastChargeAt = '2026-11-10T12:00:00.000Z'
  expect(paidSubscriptionPeriodRunning(sub, new Date('2026-11-20T12:00:00Z'))).toBe(false)
  expect(nextChargeDate(sub, now)).toBeNull()
})

test('sem calendário ou prova de período, não inventa paidAt mais um mês', () => {
  const sub = subscription({
    billing: { nextExecution: null, scheduleObservedAt: null, paidPeriod: null },
  })
  expect(nextChargeDate(sub, now)).toBeNull()
  sub.status = 'CANCELED'
  expect(paidSubscriptionPeriodRunning(sub, now)).toBe(false)
})

test.each(['2026-02-31', 'invalid', '2026-10-23'])('recusa data inválida ou passada: %s', (day) => {
  const sub = subscription()
  sub.billing.nextExecution = day
  expect(nextChargeDate(sub, now)).toBeNull()
})

test('data civil bissexta mantém fevereiro e não muda de dia em Brasília', () => {
  const at = new Date('2028-02-28T12:00:00.000Z')
  const sub = subscription()
  sub.billing = {
    nextExecution: '2028-02-29',
    scheduleObservedAt: at.toISOString(),
    paidPeriod: null,
  }
  expect(nextChargeDate(sub, at)?.toISOString()).toBe('2028-02-29T12:00:00.000Z')
})

test('observação vencida, futura ou cancelamento solicitado não prometem nova cobrança', () => {
  expect(nextChargeDate(subscription(), new Date(now.getTime() + 24 * 60 * 60_000))).toBeNull()
  expect(nextChargeDate(subscription(), new Date(now.getTime() - 1))).toBeNull()
  expect(nextChargeDate(subscription({ cancelRequestedAt: now.toISOString() }), now)).toBeNull()
})

test('período confirmado só corre entre início e fim exclusivos do recibo', () => {
  const sub = subscription({ status: 'CANCELED' })
  expect(paidSubscriptionPeriodRunning(sub, now)).toBe(true)
  expect(paidSubscriptionPeriodRunning(sub, new Date('2026-11-16T12:00:00Z'))).toBe(false)
  expect(paidSubscriptionPeriodRunning(sub, new Date('2026-10-15T12:00:00Z'))).toBe(false)
})
