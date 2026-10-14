import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { Elysia } from 'elysia'
import { CreationCleanupService } from '../../src/application/admin/creation-cleanup/creation-cleanup.service'
import { PurgeUserDataService } from '../../src/application/admin/purge-user-data/purge-user-data.service'
import type { CreationCleanupScope } from '../../src/domain/ports/creation-cleanup-repository.port'
import { buildErrorResponse } from '../../src/interfaces/http/error-handler'
import { creationCleanupRoutes } from '../../src/interfaces/http/routes/creation-cleanup.routes'
import {
  type InternalRoutesDeps,
  internalRoutes,
} from '../../src/interfaces/http/routes/internal.routes'
import { silentLogger } from '../fakes/in-memory'

const TOKEN = 'internal-test-token'

/** O mesmo mapeamento de erro do `server.ts`: o status que o worker recebe de verdade. */
function withErrors() {
  return new Elysia().onError({ as: 'global' }, ({ code, error, set }) => {
    const { status, body } = buildErrorResponse({ code, error, logger: silentLogger })
    set.status = status
    return body
  })
}

/**
 * Fila em memória com a MESMA regra do repositório: job de plano só sai para quem declarou
 * `pensa`. O SQL de verdade é provado em `tests/db/creation-cleanup.repository.test.ts`.
 */
function cleanupApp() {
  const seen: Array<readonly CreationCleanupScope[]> = []
  const planJob = {
    id: randomUUID(),
    accountId: randomUUID(),
    userIds: [randomUUID()],
    prefixes: ['creations/x/pensa/y/'],
    attempts: 1,
    scope: 'pensa' as const,
  }
  const service = new CreationCleanupService({
    claimDue: async (_now, _lease, scopes) => {
      seen.push(scopes)
      return scopes.includes('pensa') ? planJob : null
    },
    complete: async () => true,
    fail: async () => true,
  })
  const app = withErrors().use(creationCleanupRoutes({ cleanup: service, internalToken: TOKEN }))
  return { app, seen, planJob }
}

// Como o gateway entrega: `x-internal-token` injetado e `content-type` do `gatewayFetchHmac`.
const claim = (body?: string) =>
  new Request('http://localhost/members/internal/creation-cleanups/claim', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-internal-token': TOKEN },
    body,
  })

describe('claim da fila de limpeza', () => {
  test('worker antigo (POST sem corpo) nunca recebe job de plano', async () => {
    const { app, seen } = cleanupApp()
    const response = await app.handle(claim())
    expect(response.status).toBe(204)
    expect(seen).toEqual([[]])
  })

  test('worker que declara `pensa` recebe o job de plano com o escopo', async () => {
    const { app, seen, planJob } = cleanupApp()
    const response = await app.handle(claim(JSON.stringify({ scopes: ['pensa'] })))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ job: planJob })
    expect(seen).toEqual([['pensa']])
  })

  test('escopo desconhecido é ignorado, sem 422: worker novo não derruba members antigo', async () => {
    const { app, seen } = cleanupApp()
    const response = await app.handle(claim(JSON.stringify({ scopes: ['futuro'] })))
    expect(response.status).toBe(204)
    expect(seen).toEqual([[]])
  })

  test('corpo malformado é recusado na borda', async () => {
    const { app, seen } = cleanupApp()
    const response = await app.handle(claim(JSON.stringify({ scopes: 'pensa' })))
    expect(response.status).toBe(400)
    expect(seen).toEqual([])
  })
})

describe('finalize da exclusão de conta', () => {
  function finalizeApp(fenced: boolean) {
    const purged: Array<{ userIds: string[]; accountId: string }> = []
    const purgeUserData = new PurgeUserDataService({
      isFenced: async () => fenced,
      purgeForUser: async ({ userIds, accountId }) => {
        purged.push({ userIds, accountId })
      },
    })
    const app = withErrors().use(
      internalRoutes({ purgeUserData, internalToken: TOKEN } as unknown as InternalRoutesDeps),
    )
    return { app, purged }
  }
  const finalize = (accountId: string, userIds: string[]) =>
    new Request('http://localhost/members/internal/account-deletion/finalize', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-token': TOKEN },
      body: JSON.stringify({ accountId, userIds }),
    })

  test('conta SEM a cerca de exclusão → 409 e nada apagado', async () => {
    // É o pedido que um worker antigo faria a partir do job de um PLANO do Pensa.
    const { app, purged } = finalizeApp(false)
    const response = await app.handle(finalize(randomUUID(), [randomUUID()]))
    expect(response.status).toBe(409)
    expect(purged).toEqual([])
  })

  test('conta em exclusão (cerca instalada pela 1ª purga) → finaliza', async () => {
    const { app, purged } = finalizeApp(true)
    const accountId = randomUUID(),
      profileId = randomUUID()
    const response = await app.handle(finalize(accountId, [accountId, profileId]))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ finalized: true })
    expect(purged).toEqual([{ accountId, userIds: [accountId, profileId] }])
  })
})
