import { describe, expect, it } from 'bun:test'
import { STATS_WINDOW_DAYS } from '../../src/domain/ticket/ticket-stats'
import { buildTestApp, json, makeTicket, request } from '../helpers'

/** Semeia tickets datados de AGORA (a app usa `() => new Date()`) → caem na janela de hoje. */
function seedNow(overrides: Parameters<typeof makeTicket>[0]) {
  const now = new Date()
  return makeTicket({
    createdAt: now,
    updatedAt: now,
    firstMessageAt: now,
    lastInboundAt: now,
    lastMessageAt: now,
    ...overrides,
  })
}

describe('GET /helpdesk/tickets/stats', () => {
  it('caixa vazia → zeros e série densa dos últimos N dias', async () => {
    const { app } = buildTestApp()
    const res = await request(app, 'GET', '/helpdesk/tickets/stats')
    expect(res.status).toBe(200)
    const body = await json(res)
    expect(body.counts).toEqual({ new: 0, open: 0, waiting: 0 })
    expect(body.resolvedToday).toBe(0)
    expect(body.autoReplied7d).toBeUndefined()
    expect(body.sla).toEqual({ atRisk: 0, breached: 0, unassigned: 0 })
    expect(body.volume).toHaveLength(STATS_WINDOW_DAYS)
    expect(body.volume.every((p: { created: number }) => p.created === 0)).toBe(true)
  })

  it('agrega contagens por status e resolvidos de hoje pela data de resolução', async () => {
    const { app, repos } = buildTestApp()
    await repos.tickets.create(seedNow({ status: 'new' }))
    await repos.tickets.create(seedNow({ status: 'open' }))
    await repos.tickets.create(seedNow({ status: 'waiting' }))
    await repos.tickets.create({ ...seedNow({ status: 'resolved' }), resolvedAt: new Date() })
    await repos.tickets.create({ ...seedNow({ status: 'closed' }), resolvedAt: new Date() })
    // Atualizações de IA não podem fazer uma resolução antiga reaparecer no painel.
    await repos.tickets.create({
      ...seedNow({ status: 'resolved' }),
      resolvedAt: new Date('2026-01-01T12:00:00.000Z'),
    })

    const res = await request(app, 'GET', '/helpdesk/tickets/stats')
    expect(res.status).toBe(200)
    const body = await json(res)
    expect(body.counts).toEqual({ new: 1, open: 1, waiting: 1 })
    expect(body.resolvedToday).toBe(2) // resolved + closed, sem a resolução antiga
    expect(body.resolved7d).toBe(2)
    expect(body.sla).toEqual({ atRisk: 0, breached: 0, unassigned: 2 })

    const today = body.volume[body.volume.length - 1]
    expect(today.created).toBe(6)
    expect(today.autoReplied).toBeUndefined()
  })

  it('a rota estática `stats` não é engolida pela paramétrica `:id`', async () => {
    const { app } = buildTestApp()
    const res = await request(app, 'GET', '/helpdesk/tickets/stats')
    // Se caísse em `/:id`, o UUID inválido daria 400.
    expect(res.status).toBe(200)
  })
})
