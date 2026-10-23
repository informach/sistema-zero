import { expect, test } from 'bun:test'
import { ENGAGEMENT_SCOPES } from '../../src/domain/engagement/policy'
import type { SocialAccount } from '../../src/domain/social-account/social-account'
import { MetaEngagementProvider } from '../../src/infrastructure/gateways/meta/engagement-provider'

const account: SocialAccount = {
  id: 'test',
  version: 1,
  network: 'instagram',
  externalId: '123',
  displayName: 'Teste',
  username: null,
  accessTokenEnc: 'sealed',
  refreshTokenEnc: null,
  tokenExpiresAt: null,
  refreshExpiresAt: null,
  scopes: [...ENGAGEMENT_SCOPES],
  status: 'connected',
  metadata: {},
  connectedBy: 'test',
  lastRefreshAt: null,
  lastRefreshError: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}
test('adaptador usa conta explícita e token no header; resultado incompleto/timeout é incerto', async () => {
  const requests: Array<{ url: string; init: RequestInit }> = []
  const provider = new MetaEngagementProvider(
    {
      async getFreshAccessToken() {
        return 'secret'
      },
    },
    'v25.0',
    async (url, init) => {
      requests.push({ url, init })
      return Response.json({ recipient_id: 'person', message_id: 'mid' })
    },
  )
  expect(
    await provider.send(account, 'person', 'comment', { text: 'Resposta automática', buttons: [] }),
  ).toEqual({ status: 'accepted', externalId: 'mid' })
  expect(requests[0]?.url).toBe('https://graph.facebook.com/v25.0/123/messages')
  expect(requests[0]?.url).not.toContain('secret')
  expect(JSON.parse(String(requests[0]?.init.body)).recipient).toEqual({ comment_id: 'comment' })
  for (const response of [Response.json({}), new Response('', { status: 503 })]) {
    const uncertain = new MetaEngagementProvider(
      {
        async getFreshAccessToken() {
          return 'secret'
        },
      },
      'v25.0',
      async () => response,
    )
    expect(
      (await uncertain.send(account, 'person', null, { text: 'Teste', buttons: [] })).status,
    ).toBe('uncertain')
  }
  const timeout = new MetaEngagementProvider(
    {
      async getFreshAccessToken() {
        return 'secret'
      },
    },
    'v25.0',
    async () => {
      throw new Error('timeout')
    },
  )
  expect((await timeout.send(account, 'person', null, { text: 'Teste', buttons: [] })).status).toBe(
    'uncertain',
  )
  expect(
    (
      await provider.send({ ...account, status: 'revoked' }, 'person', null, {
        text: 'Teste',
        buttons: [],
      })
    ).status,
  ).toBe('failed')
  expect(requests).toHaveLength(1)
})
test('prova do post exige proprietário e ID exatos', async () => {
  const provider = new MetaEngagementProvider(
    {
      async getFreshAccessToken() {
        return 'secret'
      },
    },
    'v25.0',
    async () => Response.json({ id: '456', owner: { id: '123' } }),
  )
  expect(await provider.verifyPost(account, '456')).toBe(true)
  expect(await provider.verifyPost({ ...account, externalId: '789' }, '456')).toBe(false)
  expect(await provider.verifyPost(account, '999')).toBe(false)
})
