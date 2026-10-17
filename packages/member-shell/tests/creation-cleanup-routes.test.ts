import { describe, expect, mock, test } from 'bun:test'
import type { GatewayModule } from '../src/server/gateway'

mock.module('server-only', () => ({}))

const { createCreationCleanupWorkerRoutes } = await import('../src/routes/creation-cleanup')

const SECRET = 'test-creation-cleanup-secret'

function request(secret = SECRET): Request {
  return new Request('http://localhost/api/internal/creation-cleanups', {
    method: 'POST',
    headers: { authorization: `Bearer ${secret}` },
  })
}

describe('worker durável de limpeza das criações', () => {
  test('limpeza de plano nunca chama finalização de exclusão da conta', async () => {
    const paths: string[] = []
    const claimBodies: unknown[] = []
    let claimed = false
    const gateway = {
      gatewayFetchHmac: async (path: string, options?: { body?: unknown }) => {
        paths.push(path)
        if (path.endsWith('/claim')) {
          claimBodies.push(options?.body)
          if (claimed) return { status: 204, body: null }
          claimed = true
          return {
            status: 200,
            body: {
              job: {
                id: 'plan',
                accountId: 'account',
                userIds: ['child'],
                prefixes: ['creations/child/pensa/plan/'],
                attempts: 1,
                scope: 'pensa',
              },
            },
          }
        }
        return { status: 200, body: { completed: true } }
      },
    } as unknown as GatewayModule
    const route = createCreationCleanupWorkerRoutes({
      gateway,
      deletePrefixes: async () => {},
    }).creationCleanupWorker
    expect((await route.POST(request())).status).toBe(200)
    expect(paths.some((path) => path.includes('account-deletion'))).toBe(false)
    expect(paths).toContain('/members/internal/creation-cleanups/plan/complete')
    // Todo claim DECLARA que este worker entende a limpeza de plano: sem isso o members
    // nunca entrega job de plano (um worker antigo finalizaria a conta da família).
    expect(claimBodies).toEqual([{ scopes: ['pensa'] }, { scopes: ['pensa'] }])
  })
  test('recusa chamada sem o bearer do scheduler', async () => {
    const gateway = {
      gatewayFetchHmac: async () => {
        throw new Error('não deveria chamar o gateway')
      },
    } as unknown as GatewayModule
    const route = createCreationCleanupWorkerRoutes({ gateway }).creationCleanupWorker

    const response = await route.POST(request('segredo-incorreto-com-24-chars'))

    expect(response.status).toBe(401)
  })

  test('apaga os prefixos, confirma o job e para quando a fila esvazia', async () => {
    const calls: string[] = []
    let claim = 0
    const gateway = {
      gatewayFetchHmac: async (path: string) => {
        calls.push(path)
        if (path.endsWith('/claim')) {
          claim += 1
          return claim === 1
            ? {
                status: 200,
                body: {
                  job: {
                    id: 'job-1',
                    accountId: 'conta-1',
                    userIds: ['conta-1', 'perfil-1'],
                    prefixes: ['creations/a/', 'creations/b/'],
                    attempts: 1,
                  },
                },
              }
            : { status: 204, body: null }
        }
        if (path.endsWith('/tombstones/compact')) return { status: 200, body: { compacted: 7 } }
        return { status: 200, body: { completed: true } }
      },
    } as unknown as GatewayModule
    const route = createCreationCleanupWorkerRoutes({
      gateway,
      deletePrefixes: async (prefixes) => {
        calls.push(`R2 ${prefixes.join(',')}`)
      },
    }).creationCleanupWorker

    const response = await route.POST(request())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      completed: 1,
      failed: 0,
      compacted: 7,
      tombstoneCompactionFailed: false,
      rewardsFailed: false,
    })
    expect(calls).toEqual([
      '/members/internal/pensa/rewards/work',
      '/members/internal/creation-cleanups/claim',
      'R2 creations/a/,creations/b/',
      '/hub/internal/account-deletion/finalize',
      '/members/internal/account-deletion/finalize',
      '/members/internal/creation-cleanups/job-1/complete',
      '/members/internal/creation-cleanups/claim',
      '/members/creations/tombstones/compact',
    ])
  })

  test('libera o job para retry quando o R2 falha', async () => {
    const calls: Array<{ path: string; body?: unknown }> = []
    let claim = 0
    const gateway = {
      gatewayFetchHmac: async (path: string, options?: { body?: unknown }) => {
        calls.push({ path, body: options?.body })
        if (path.endsWith('/claim')) {
          claim += 1
          return claim === 1
            ? {
                status: 200,
                body: {
                  job: {
                    id: 'job-2',
                    accountId: 'conta-2',
                    userIds: ['conta-2'],
                    prefixes: ['creations/a/'],
                    attempts: 3,
                  },
                },
              }
            : { status: 204, body: null }
        }
        return { status: 200, body: { released: true } }
      },
    } as unknown as GatewayModule
    const route = createCreationCleanupWorkerRoutes({
      gateway,
      deletePrefixes: async () => {
        throw new Error('R2 indisponível')
      },
    }).creationCleanupWorker

    const response = await route.POST(request())

    expect(await response.json()).toEqual({
      completed: 0,
      failed: 1,
      compacted: 0,
      tombstoneCompactionFailed: false,
      rewardsFailed: false,
    })
    expect(calls[2]).toEqual({
      path: '/members/internal/creation-cleanups/job-2/fail',
      body: { error: 'R2 indisponível', attempts: 3 },
    })
  })
  test('a failed Pensa outbox attempt cannot undo successful account cleanup', async () => {
    const paths: string[] = []
    const gateway = {
      gatewayFetchHmac: async <T>(path: string): Promise<{ status: number; body: T }> => {
        paths.push(path)
        if (path.endsWith('/rewards/work')) throw new Error('rewards unavailable')
        if (path.endsWith('/claim')) return { status: 204, body: null as T }
        return { status: 200, body: { compacted: 2 } as T }
      },
    }
    const route = createCreationCleanupWorkerRoutes({ gateway }).creationCleanupWorker
    const response = await route.POST(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      completed: 0,
      failed: 0,
      compacted: 2,
      tombstoneCompactionFailed: false,
      rewardsFailed: true,
    })
    expect(paths.filter((path) => path.endsWith('/rewards/work'))).toHaveLength(1)
  })
})
