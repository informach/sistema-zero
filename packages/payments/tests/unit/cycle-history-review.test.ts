import { expect, test } from 'bun:test'
import { allPaidCycleHistory } from '../../src/infrastructure/gateways/efi/efi-cycle-history-review'

const observed = new Date('2026-10-24T12:00:00Z')
const source = () => ({
  data: {
    subscription_id: 123,
    status: 'active',
    history: [
      { charge_id: 2, status: 'paid', created_at: '2026-10-01 12:00:00' },
      { charge_id: 1, status: 'refunded', created_at: '2026-09-01 12:00:00' },
    ],
  },
})
test('revisão exige fonte ativa, identificada e integralmente comprovada como paga', () => {
  expect(allPaidCycleHistory(source(), '123', observed)).toEqual(['1', '2'])
  for (const kind of [
    'identity',
    'status',
    'unknown',
    'duplicate',
    'date',
    'future',
    'empty',
  ] as const) {
    const raw = source()
    if (kind === 'identity') raw.data.subscription_id = 124
    if (kind === 'status') raw.data.status = 'canceled'
    if (kind === 'unknown') raw.data.history[0]!.status = 'unpaid'
    if (kind === 'duplicate') raw.data.history[0]!.charge_id = 1
    if (kind === 'date') raw.data.history[0]!.created_at = 'invalid'
    if (kind === 'future') raw.data.history[0]!.created_at = '2030-01-01 12:00:00'
    if (kind === 'empty') raw.data.history = []
    expect(allPaidCycleHistory(raw, '123', observed)).toBeNull()
  }
})
