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
    })
    expect(calls).toEqual([
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
    })
    expect(calls[1]).toEqual({
      path: '/members/internal/creation-cleanups/job-2/fail',
      body: { error: 'R2 indisponível', attempts: 3 },
    })
  })
})
