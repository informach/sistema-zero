import { expect, test } from 'bun:test'
import { Elysia } from 'elysia'
import { LiveMaterialsService } from '../../src/application/live/live-materials.service'
import type { LiveMaterialRecord } from '../../src/domain/ports/live-materials.port'
import { buildErrorResponse } from '../../src/interfaces/http/error-handler'
import { liveMaterialsRoutes } from '../../src/interfaces/http/routes/live-materials.routes'
import { silentLogger } from '../fakes/in-memory'

test('material registration requires both trusted gateway origin and the authenticated BFF consumer', async () => {
  const rows = new Map<string, LiveMaterialRecord>()
  const service = new LiveMaterialsService({
    find: async (id) => rows.get(id) ?? null,
    create: async (value) => {
      rows.set(value.id, value)
    },
  })
  const app = new Elysia()
    .onError({ as: 'global' }, ({ code, error, set }) => {
      const response = buildErrorResponse({ code, error, logger: silentLogger })
      set.status = response.status
      return response.body
    })
    .use(liveMaterialsRoutes({ materials: service, internalToken: 'internal-test' }))
  const id = crypto.randomUUID()
  const body = {
    id,
    title: 'Guia',
    fileName: 'guia.pdf',
    storageKey: `live/materials/${id}/guia.pdf`,
    contentType: 'application/pdf',
    sizeBytes: 100,
    sha256: 'a'.repeat(64),
    uploadedBy: crypto.randomUUID(),
  }
  const send = (headers: Record<string, string>) =>
    app.handle(
      new Request('http://localhost/members/internal/live/materials', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        body: JSON.stringify(body),
      }),
    )
  expect((await send({ 'x-auth-consumer-id': 'member-shell' })).status).toBe(401)
  expect(
    (await send({ 'x-internal-token': 'internal-test', 'x-auth-user-role': 'admin' })).status,
  ).toBe(401)
  expect(rows.size).toBe(0)
  expect(
    (await send({ 'x-internal-token': 'internal-test', 'x-auth-consumer-id': 'member-shell' }))
      .status,
  ).toBe(200)
  expect(rows.size).toBe(1)
})
