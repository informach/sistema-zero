import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { ingestChallengeEvents } from '../../src/server/challenge-events'
import { createFakeRepo } from '../fakes/fake-db'

const TOKEN = 'token-interno-com-mais-de-16'

function request(body: unknown, token = TOKEN): Request {
  return new Request('http://localhost/api/internal/challenge-events', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-internal-token': token },
    body: JSON.stringify(body),
  })
}

describe('POST /api/internal/challenge-events', () => {
  test('exige token, resolve pelo buyer id e deduplica sem receber PII', async () => {
    const { repo, events } = createFakeRepo()
    const accountId = randomUUID()
    const { id } = await repo.createLead('kids/desafio-primeiro-jogo', {
      version: 1,
      utmSource: 'clinica-centro',
      utmMedium: 'qr',
      utmCampaign: 'setembro',
      utmContent: null,
      eventCode: 'CLINICA_09',
      initialCouponCode: 'EVENTO37',
      landingPath: '/kids/desafio-primeiro-jogo/oferta',
    })
    await repo.updateLead(id, {
      offerRef: 'desafio-primeiro-jogo-30-dias',
      buyerUserId: accountId,
    })
    await repo.markPaid(id, new Date('2026-09-16T12:00:00Z'))
    const body = {
      events: [
        {
          buyerUserId: accountId,
          eventName: 'challenge_started',
          occurredAt: '2026-09-17T12:00:00.000Z',
        },
      ],
    }

    expect(
      (await ingestChallengeEvents(request(body, 'errado'), { repo, internalToken: TOKEN })).status,
    ).toBe(401)
    const first = await ingestChallengeEvents(request(body), { repo, internalToken: TOKEN })
    const second = await ingestChallengeEvents(request(body), { repo, internalToken: TOKEN })
    expect(first.status).toBe(202)
    expect(await first.json()).toEqual({ accepted: 1, inserted: 1 })
    expect(await second.json()).toEqual({ accepted: 1, inserted: 0 })
    expect(events.filter((event) => event.eventName === 'challenge_started')).toHaveLength(1)
    expect(JSON.stringify(events)).not.toContain('@')
  })

  test('assinatura da Comunidade volta para a jornada anterior do Desafio', async () => {
    const { repo, events } = createFakeRepo()
    const accountId = randomUUID()
    const challenge = await repo.createLead('kids/desafio-primeiro-jogo')
    await repo.updateLead(challenge.id, {
      offerRef: 'desafio-primeiro-jogo-30-dias',
      buyerUserId: accountId,
    })
    await repo.markPaid(challenge.id, new Date('2026-09-16T12:00:00Z'))

    const community = await repo.createLead('kids/comunidade-dos-criadores')
    await repo.updateLead(community.id, { offerRef: 'comunidade-dos-criadores-mensal' })
    await repo.markPaid(community.id, new Date('2026-09-20T12:00:00Z'))
    await repo.recordCommunitySubscription(community.id, accountId)
    await repo.recordCommunitySubscription(community.id, accountId)

    expect(
      events.filter((event) => event.eventName === 'community_subscription_approved'),
    ).toHaveLength(1)
    expect(
      events.find((event) => event.eventName === 'community_subscription_approved')?.leadId,
    ).toBe(challenge.id)
  })
})
