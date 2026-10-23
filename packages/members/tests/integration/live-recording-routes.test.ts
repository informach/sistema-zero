import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { Elysia } from 'elysia'
import { LiveService } from '../../src/application/live/live.service'
import { liveRecordingRoutes } from '../../src/infrastructure/live/live-recording.routes'
import { liveRoutes } from '../../src/interfaces/http/routes/live.routes'
import { InMemoryLiveRepository } from '../fakes/live-in-memory'

test('a aplicação compila publicação e comandos de gravação no mesmo roteador', async () => {
  const internalToken = 'internal-test-token'
  const calls: { id: string; action: string }[] = []
  const app = new Elysia()
    .use(
      liveRoutes({
        live: new LiveService(new InMemoryLiveRepository(), () => new Date(), {
          assertOwnership: async () => ({ name: 'Criança' }),
        }),
        internalToken,
        requireAdminEnabled: true,
      }),
    )
    .use(
      liveRecordingRoutes({
        internalToken,
        token: 'r'.repeat(32),
        recording: {
          async command(_actor, id, action) {
            calls.push({ id, action })
          },
          async acceptEvent() {},
        },
      }),
    )
  try {
    // listen exercises the same composed Bun router as the deployed application.
    app.listen({ hostname: '127.0.0.1', port: 0 })
    const id = randomUUID()
    const response = await fetch(
      `${app.server!.url}members/admin/live/sessions/${id}/recording/pause`,
      {
        method: 'POST',
        headers: {
          'x-internal-token': internalToken,
          'x-auth-user-id': randomUUID(),
          'x-auth-user-role': 'admin',
          'x-auth-user-status': 'active',
        },
      },
    )
    expect(response.status).toBe(200)
    expect(calls).toEqual([{ id, action: 'pause' }])
  } finally {
    if (app.server) await app.stop()
  }
})
