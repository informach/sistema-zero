import { describe, expect, it } from 'bun:test'
import { matchesSlaFilter, ticketSla, ticketSlaRank } from '../../src/domain/ticket/ticket-sla'
import { makeTicket } from '../helpers'

const STARTED_AT = new Date('2026-09-01T12:00:00.000Z')

function activeTicket(overrides: Parameters<typeof makeTicket>[0] = {}) {
  return makeTicket({
    status: 'new',
    firstMessageAt: STARTED_AT,
    lastInboundAt: STARTED_AT,
    ...overrides,
  })
}

describe('ticket SLA', () => {
  it('uses the configured target for priority and enters risk at the final quarter', () => {
    const ticket = activeTicket({ priority: 'alta' })

    expect(ticketSla(ticket, new Date('2026-09-01T14:00:00.000Z'))).toMatchObject({
      state: 'on_track',
      targetMinutes: 240,
      remainingMinutes: 120,
    })
    expect(ticketSla(ticket, new Date('2026-09-01T15:00:00.000Z'))).toMatchObject({
      state: 'at_risk',
      targetMinutes: 240,
      remainingMinutes: 60,
    })
    expect(ticketSla(ticket, new Date('2026-09-01T16:00:00.000Z'))).toMatchObject({
      state: 'breached',
      remainingMinutes: 0,
    })
  })

  it('falls back to normal priority, records breaches, and sorts them first', () => {
    const breached = activeTicket({ priority: null })
    const now = new Date('2026-09-02T00:01:00.000Z')
    const sla = ticketSla(breached, now)

    expect(sla).toMatchObject({ state: 'breached', priority: 'normal', targetMinutes: 720 })
    expect(matchesSlaFilter(sla, 'attention')).toBe(true)
    expect(ticketSlaRank(breached, now)).toBe(0)
  })

  it('pauses the clock for tickets that are waiting or already finished', () => {
    const now = new Date('2026-09-02T00:01:00.000Z')

    expect(ticketSla(activeTicket({ status: 'waiting' }), now)).toBeNull()
    expect(ticketSla(activeTicket({ status: 'resolved' }), now)).toBeNull()
    expect(ticketSlaRank(activeTicket({ status: 'closed' }), now)).toBe(3)
  })
})
