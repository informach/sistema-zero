import { expect, test } from 'bun:test'
import { Elysia } from 'elysia'
import { LivePublicationService } from '../../src/application/live/live-publication.service'
import { livePublicationRoutes } from '../../src/interfaces/http/routes/live-publication.routes'

test('publication HTTP requires a request key and preserves the playable ID on retry', async () => {
  const userId = crypto.randomUUID(),
    accountId = crypto.randomUUID(),
    id = crypto.randomUUID()
  const service = new LivePublicationService(
    {
      showcaseSnapshot: async (actor, workspaceId, revision) => {
        expect(actor.id).toBe(userId)
        expect(actor.accountId).toBe(accountId)
        return { workspaceId, revision, project: { id: workspaceId }, title: 'Jogo' }
      },
    },
    'test-secret',
  )
  const app = new Elysia().use(
    livePublicationRoutes({ publication: service, internalToken: 'internal-test' }),
  )
  const request = (key?: string) =>
    app.handle(
      new Request(
        `http://localhost/members/live/workspaces/${id}/showcase?revision=1${key ? `&clientIdempotencyKey=${key}` : ''}`,
        {
          headers: {
            'x-internal-token': 'internal-test',
            'x-auth-user-id': userId,
            'x-auth-account-id': accountId,
            'x-auth-user-role': 'student',
          },
        },
      ),
    )
  expect((await request()).status).toBe(422)
  expect((await request('invalid')).status).toBe(422)
  const key = crypto.randomUUID()
  const first = await request(key),
    second = await request(key)
  expect(first.status).toBe(200)
  expect(second.status).toBe(200)
  const initial = (await first.json()) as Awaited<ReturnType<typeof service.prepare>>
  const retry = (await second.json()) as Awaited<ReturnType<typeof service.prepare>>
  expect(initial.playId).toMatch(/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i)
  expect(retry.playId).toBe(initial.playId)
})
