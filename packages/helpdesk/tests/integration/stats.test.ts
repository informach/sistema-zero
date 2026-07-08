import { describe, expect, it } from 'bun:test'
import { STATS_WINDOW_DAYS } from '../../src/domain/ticket/ticket-stats'
import { buildTestApp, json, makeTicket, request } from '../helpers'

/** Semeia tickets datados de AGORA (a app usa `() => new Date()`) → caem na janela de hoje. */
function seedNow(overrides: Parameters<typeof makeTicket>[0]) {
  const now = new Date()
  return makeTicket({ createdAt: now, updatedAt: now, lastMessageAt: now, ...overrides })
}

describe('GET /helpdesk/tickets/stats', () => {
  it('caixa vazia → zeros e série densa dos últimos N dias', async () => {
    const { app } = buildTestApp()
    const res = await request(app, 'GET', '/helpdesk/tickets/stats')
    expect(res.status).toBe(200)
    const body = await json(res)
    expect(body.counts).toEqual({ new: 0, open: 0, waiting: 0 })
    expect(body.resolvedToday).toBe(0)
    expect(body.autoReplied7d).toBe(0)
    expect(body.volume).toHaveLength(STATS_WINDOW_DAYS)
    expect(body.volume.every((p: { created: number }) => p.created === 0)).toBe(true)
  })

  it('agrega contagens por status, resolvidos e auto-respostas de hoje', async () => {
    const { app, repos } = buildTestApp()
    const now = new Date()
    await repos.tickets.create(seedNow({ status: 'new' }))
    await repos.tickets.create(seedNow({ status: 'open' }))
    await repos.tickets.create(seedNow({ status: 'waiting' }))
    await repos.tickets.create(seedNow({ status: 'resolved' }))
    await repos.tickets.create(seedNow({ status: 'closed' }))
    await repos.tickets.create(
      seedNow({ status: 'waiting', autoReplyState: 'sent', autoRepliedAt: now }),
    )

    const res = await request(app, 'GET', '/helpdesk/tickets/stats')
    expect(res.status).toBe(200)
    const body = await json(res)
    expect(body.counts).toEqual({ new: 1, open: 1, waiting: 2 })
    expect(body.resolvedToday).toBe(2) // resolved + closed
    expect(body.resolved7d).toBe(2)
    expect(body.autoRepliedToday).toBe(1)
    expect(body.autoReplied7d).toBe(1)

    const today = body.volume[body.volume.length - 1]
    expect(today.created).toBe(6)
    expect(today.autoReplied).toBe(1)
  })

  it('a rota estática `stats` não é engolida pela paramétrica `:id`', async () => {
    const { app } = buildTestApp()
    const res = await request(app, 'GET', '/helpdesk/tickets/stats')
    // Se caísse em `/:id`, o UUID inválido daria 400.
    expect(res.status).toBe(200)
  })
})
