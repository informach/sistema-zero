import { expect, test } from 'bun:test'
import { CancellationRecord } from '../../src/domain/subscription/cancellation-record'

const now = new Date('2026-10-24T12:00:00Z')
const caseId = '11111111-1111-4111-8111-111111111111'
test('origem e autor distinguem cliente, equipe e consumidor, sem inferir pelo e-mail', () => {
  for (const origin of ['CUSTOMER', 'ADMIN', 'CONSUMER'] as const) {
    const record = CancellationRecord.request({ origin, actorId: 'qa-opaque-actor' }, now)
    expect(record.toSnapshot()).toMatchObject({
      origin,
      actorId: 'qa-opaque-actor',
      requestedAt: now,
      confirmedAt: null,
      recoveryCaseId: null,
    })
  }
})
test('não pagamento exige caso real identificado e ator do processo', () => {
  const record = CancellationRecord.request(
    { origin: 'NONPAYMENT', actorId: 'system:subscription-recovery', recoveryCaseId: caseId },
    now,
  )
  expect(record.toSnapshot().recoveryCaseId).toBe(caseId)
  expect(() =>
    CancellationRecord.request(
      {
        origin: 'NONPAYMENT',
        actorId: 'system:subscription-recovery',
        recoveryCaseId: 'not-a-case',
      },
      now,
    ),
  ).toThrow()
  expect(() =>
    CancellationRecord.restore({ ...record.toSnapshot(), actorId: 'qa-admin' }),
  ).toThrow()
})
test('confirmação mantém a primeira evidência e não aceita outro encerramento', () => {
  const record = CancellationRecord.request({ origin: 'CUSTOMER', actorId: 'qa-owner' }, now)
  const later = new Date(now.getTime() + 1_000)
  const confirmed = record.confirm('CANCELED', later)
  expect(record.toSnapshot().confirmedAt).toBeNull()
  expect(
    confirmed.confirm('CANCELED', new Date(later.getTime() + 1_000)).toSnapshot().confirmedAt,
  ).toEqual(later)
  expect(() => confirmed.confirm('EXPIRED', later)).toThrow()
  expect(() => record.confirm('CANCELED', new Date(now.getTime() - 1))).toThrow()
})
test('observação externa e fim do plano não inventam pedido do cliente', () => {
  const external = CancellationRecord.observed('EXTERNAL', 'CANCELED', now).toSnapshot()
  expect(external).toMatchObject({
    requestedAt: null,
    actorId: null,
    confirmedAt: now,
    endedStatus: 'CANCELED',
  })
  expect(
    CancellationRecord.observed('SCHEDULE_COMPLETED', 'EXPIRED', now).toSnapshot().actorId,
  ).toBe('system:subscription-schedule')
  expect(() => CancellationRecord.observed('SCHEDULE_COMPLETED', 'CANCELED', now)).toThrow()
})
test('só o pedido automático não confirmado pode ser retirado, sem apagar origem', () => {
  const record = CancellationRecord.request(
    { origin: 'NONPAYMENT', actorId: 'system:subscription-recovery', recoveryCaseId: caseId },
    now,
  )
  const withdrawn = record.withdraw('RECOVERED', new Date(now.getTime() + 1_000))
  expect(withdrawn.toSnapshot()).toMatchObject({
    origin: 'NONPAYMENT',
    withdrawalReason: 'RECOVERED',
    confirmedAt: null,
  })
  expect(() => withdrawn.confirm('CANCELED', now)).toThrow()
  expect(() =>
    CancellationRecord.request({ origin: 'ADMIN', actorId: 'qa-admin' }, now).withdraw(
      'RECOVERED',
      now,
    ),
  ).toThrow()
  expect(() => record.confirm('CANCELED', now).withdraw('RECOVERED', now)).toThrow()
})
test('datas/retomada são cópias; uma substituição explícita preserva referência anterior', () => {
  const inputNow = new Date(now)
  const first = CancellationRecord.request(
    { origin: 'NONPAYMENT', actorId: 'system:subscription-recovery', recoveryCaseId: caseId },
    inputNow,
  )
  inputNow.setTime(0)
  const snapshot = first.toSnapshot()
  snapshot.recordedAt.setTime(0)
  expect(first.toSnapshot().recordedAt).toEqual(now)
  const next = CancellationRecord.request(
    { origin: 'CUSTOMER', actorId: 'qa-owner' },
    now,
    first.id,
  )
  expect(next.toSnapshot().supersedesId).toBe(first.id)
  expect(() =>
    CancellationRecord.restore({ ...next.toSnapshot(), supersedesId: next.id }),
  ).toThrow()
})
