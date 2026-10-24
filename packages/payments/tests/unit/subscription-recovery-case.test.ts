import { expect, test } from 'bun:test'
import {
  type RecoverySourceProof,
  SubscriptionRecoveryCase,
} from '../../src/domain/subscription-recovery/recovery-case'
import {
  DAY_MS,
  INITIAL_RECOVERY_POLICY,
  snapshotRecoveryPolicy,
} from '../../src/domain/subscription-recovery/recovery-policy'

const start = new Date('2026-10-24T12:00:00Z')
const atDay = (days: number) => new Date(start.getTime() + days * DAY_MS)
function open(audience: 'kids' | 'adult' = 'kids') {
  return SubscriptionRecoveryCase.open({
    subscriptionId: 'sub-qa',
    consumerId: 'owner-qa',
    providerSubscriptionId: 'provider-qa',
    paymentId: 'payment-qa',
    providerPaymentId: 'charge-qa',
    audience,
    amountInCents: 9700n,
    firstFailureAt: atDay(-2),
    now: start,
    policy: INITIAL_RECOVERY_POLICY,
  })
}
function proof(now: Date, extra: Partial<RecoverySourceProof> = {}): RecoverySourceProof {
  return {
    checkedAt: now,
    providerSubscriptionId: 'provider-qa',
    providerPaymentId: 'charge-qa',
    amountInCents: 9700n,
    subscriptionStatus: 'ACTIVE',
    paymentStatus: 'FAILED',
    paymentOperationPending: false,
    ...extra,
  }
}

test.each([
  'kids',
  'adult',
] as const)('mesma agenda para %s, prazo só começa após aceite do aviso inicial', (audience) => {
  const item = open(audience)
  expect(item.nextStep(atDay(30))).toEqual({ kind: 'INITIAL_NOTICE' })
  item.applySource(proof(atDay(30)), atDay(30))
  expect(item.state).toBe('OPEN')
  expect(item.toSnapshot().deadlineAt).toBeNull()
  item.acceptInitialNotice('notice-qa', atDay(30), atDay(30))
  expect(item.toSnapshot().deadlineAt).toEqual(atDay(37))
})
test('D0/D3/D6/D7 e atualização de política não alteram o caso aberto', () => {
  const item = open()
  item.acceptInitialNotice('notice-qa', start, start)
  expect(item.nextStep(atDay(2))).toBeNull()
  expect(item.nextStep(atDay(3))).toEqual({ kind: 'REMINDER', day: 3 })
  item.acceptReminder(3, atDay(3))
  expect(item.nextStep(atDay(5))).toBeNull()
  expect(item.nextStep(atDay(6))).toEqual({ kind: 'REMINDER', day: 6 })
  item.acceptReminder(6, atDay(6))
  expect(item.nextStep(atDay(7))).toEqual({ kind: 'CHECK_CANCELLATION' })
  const copy = item.toSnapshot()
  copy.policy.reminderDays = [1]
  expect(item.toSnapshot().policy.reminderDays).toEqual([3, 6])
})
test('scheduler atrasado agrupa lembretes no mais recente', () => {
  const item = open()
  item.acceptInitialNotice('notice-qa', start, start)
  expect(item.nextStep(atDay(6))).toEqual({ kind: 'REMINDER', day: 6 })
  expect(() => item.acceptReminder(3, atDay(6))).toThrow()
})
test('reentrega de aviso não reinicia prazo nem aceita outro aviso inicial', () => {
  const item = open()
  item.acceptInitialNotice('notice-qa', start, start)
  item.acceptInitialNotice('notice-qa', atDay(2), atDay(2))
  expect(item.toSnapshot().deadlineAt).toEqual(atDay(7))
  expect(() => item.acceptInitialNotice('other-qa', atDay(2), atDay(2))).toThrow()
})
test('pagamento confirmado suprime lembretes, sem gerar acesso ou cobrança', () => {
  const item = open()
  item.acceptInitialNotice('notice-qa', start, start)
  item.applySource(proof(atDay(2), { paymentStatus: 'PAID' }), atDay(2))
  expect(item.state).toBe('RECOVERED')
  expect(item.nextStep(atDay(7))).toBeNull()
  expect(item.events.map((event) => event.eventName)).toEqual(['subscription.recovery.changed'])
  item.applySource(proof(atDay(3), { paymentStatus: 'PAID' }), atDay(3))
  expect(item.events).toHaveLength(1)
})
test('D7 só solicita cancelamento após prova nova, nunca declara cancelado', () => {
  const item = open()
  item.acceptInitialNotice('notice-qa', start, start)
  item.applySource(proof(atDay(7)), atDay(7))
  expect(item.state).toBe('CANCEL_PENDING')
  expect(item.toSnapshot().closedAt).toBeNull()
  item.applySource(proof(atDay(7), { subscriptionStatus: 'CANCELED' }), atDay(7))
  expect(item.state).toBe('CANCELED')
  expect(item.toSnapshot().reason).toBe('UNPAID_AFTER_NOTICE')
})

test('cancelamento externo confirmado não é confundido com encerramento D7', () => {
  const item = open()
  item.applySource(proof(start, { subscriptionStatus: 'CANCELED' }), start)
  expect(item.toSnapshot().reason).toBe('EXTERNAL_CANCELLATION')
})

test('fim da análise antes de D7 retoma a agenda, sem ficar em polling vencido', () => {
  const item = open()
  item.acceptInitialNotice('notice-qa', start, start)
  item.applySource(proof(atDay(1), { paymentStatus: 'PENDING' }), atDay(1))
  item.applySource(proof(atDay(2)), atDay(2))
  expect(item.toSnapshot().nextActionAt).toEqual(atDay(3))
})

test('restauração recusa aviso parcial ou prazo incoerente, sem inventar normalização', () => {
  const item = open()
  const snapshot = item.toSnapshot()
  snapshot.initialNoticeId = 'notice-qa'
  expect(() => SubscriptionRecoveryCase.restore(snapshot)).toThrow()
  item.acceptInitialNotice('notice-qa', start, start)
  const notified = item.toSnapshot()
  notified.deadlineAt = atDay(6)
  expect(() => SubscriptionRecoveryCase.restore(notified)).toThrow()
})
test.each([
  true,
  false,
])('operação pendente=%s ou cobrança em análise impede D7 e escala revisão', (operation) => {
  const item = open()
  item.acceptInitialNotice('notice-qa', start, start)
  item.applySource(
    proof(atDay(7), {
      paymentStatus: operation ? 'FAILED' : 'PENDING',
      paymentOperationPending: operation,
    }),
    atDay(7),
  )
  expect(item.state).toBe('MANUAL_REVIEW')
  expect(item.toSnapshot().reason).toBe('PAYMENT_UNCERTAIN')
  expect(item.nextStep(atDay(8))).toBeNull()
})
test('falha de contato não vira permissão de cancelar em silêncio', () => {
  const item = open()
  item.contactFailed(start)
  expect(item.state).toBe('MANUAL_REVIEW')
  expect(item.toSnapshot().reason).toBe('CONTACT_FAILED')
  expect(item.nextStep(atDay(20))).toBeNull()
})
test('prova vencida, de outra identidade ou valor não muda o caso', () => {
  for (const change of [
    { checkedAt: new Date(start.getTime() - 60_001) },
    { providerPaymentId: 'other' },
    { providerSubscriptionId: 'other' },
    { amountInCents: 1n },
  ]) {
    const item = open()
    expect(() => item.applySource(proof(start, change), start)).toThrow()
    expect(item.toSnapshot().lastProviderCheckAt).toBeNull()
  }
})
test('snapshot e datas são cópias, reabertura não reinicia a agenda', () => {
  const item = open()
  item.acceptInitialNotice('notice-qa', start, start)
  const snapshot = item.toSnapshot()
  const restored = SubscriptionRecoveryCase.restore(snapshot)
  snapshot.deadlineAt?.setFullYear(2040)
  expect(restored.toSnapshot().deadlineAt).toEqual(atDay(7))
  expect(restored.events).toHaveLength(0)
  expect(restored.isNew).toBe(false)
})
test.each([
  { version: 0, windowDays: 7, reminderDays: [3, 6] },
  { version: 1, windowDays: 0, reminderDays: [] },
  { version: 1, windowDays: 7, reminderDays: [6, 3] },
  { version: 1, windowDays: 7, reminderDays: [3, 3] },
  { version: 1, windowDays: 7, reminderDays: [7] },
])('política incoerente é recusada: %#', (policy) =>
  expect(() => snapshotRecoveryPolicy(policy)).toThrow())
