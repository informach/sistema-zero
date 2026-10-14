import { describe, expect, mock, test } from 'bun:test'
import { randomUUID } from 'node:crypto'

mock.module('server-only', () => ({}))
const { handleLivePreview } = await import('../src/routes/live-preview')

describe('isolated live previews', () => {
  const sessionId = randomUUID()
  const request = (body = '<p>Jogo</p>', workspaceId?: string) =>
    new Request('https://kids.test/api/live/preview', {
      method: 'POST',
      body,
      headers: workspaceId ? { 'x-live-workspace-id': workspaceId } : {},
    })
  function storage() {
    const puts: string[] = [],
      removals: string[] = [],
      ttls: number[] = []
    return {
      puts,
      removals,
      ttls,
      io: {
        put: async (input: { key: string }) => {
          puts.push(input.key)
        },
        sign: async (_key: string, options?: { expiresInSeconds?: number }) => {
          ttls.push(options?.expiresInSeconds ?? 0)
          return 'https://private.r2.cloudflarestorage.com/temporary'
        },
        remove: async (key: string) => {
          removals.push(key)
        },
      },
    }
  }
  const room = () => ({
    status: 200,
    body: {
      actorId: randomUUID(),
      role: 'learner',
      access: { canOpen: true, endsAt: new Date(Date.now() + 25_000).toISOString() },
    },
  })

  test('expired lessons cannot allocate preview objects without authorized continuation', async () => {
    const files = storage()
    const response = await handleLivePreview(
      request(),
      sessionId,
      async () => ({ status: 200, body: { access: { canOpen: false } } }),
      files.io,
    )
    expect(response.status).toBe(403)
    expect(files.puts).toEqual([])
  })
  test('active lessons sign a separate origin only within the remaining grant', async () => {
    const files = storage(),
      access = room()
    const response = await handleLivePreview(request(), sessionId, async () => access, files.io)
    expect(response.status).toBe(201)
    expect(files.puts[0]).toStartWith(`live/previews/${sessionId}/${access.body.actorId}/`)
    expect(files.ttls[0]).toBeLessThanOrEqual(25)
    expect((await response.json()).url).toStartWith('https://private.r2.cloudflarestorage.com/')
  })
  test('subscription continuation must authorize the exact existing project and session', async () => {
    const files = storage(),
      workspaceId = randomUUID(),
      learnerId = randomUUID()
    const calls: string[] = []
    const response = await handleLivePreview(
      request(undefined, workspaceId),
      sessionId,
      async (path) => {
        calls.push(path)
        return path.endsWith(workspaceId)
          ? { status: 200, body: { sessionId, learnerId } }
          : { status: 200, body: { access: { canOpen: false } } }
      },
      files.io,
    )
    expect(response.status).toBe(201)
    expect(calls).toContain(`/members/live/workspaces/${workspaceId}`)
    expect(files.puts[0]).toStartWith(`live/previews/${sessionId}/${learnerId}/`)
    const refused = await handleLivePreview(
      request(undefined, workspaceId),
      sessionId,
      async (path) =>
        path.endsWith(workspaceId)
          ? { status: 200, body: { sessionId: randomUUID(), learnerId } }
          : { status: 403, body: {} },
      files.io,
    )
    expect(refused.status).toBe(403)
    expect(files.puts).toHaveLength(1)
  })
  test('oversized streamed documents are rejected before storage; signing failures remove uploads', async () => {
    const files = storage()
    expect(
      (
        await handleLivePreview(
          request('x'.repeat(4_000_001)),
          sessionId,
          async () => room(),
          files.io,
        )
      ).status,
    ).toBe(413)
    expect(files.puts).toHaveLength(0)
    const error = await handleLivePreview(request(), sessionId, async () => room(), {
      ...files.io,
      sign: async () => {
        throw new Error('sign failed')
      },
    }).then(
      () => null,
      (error) => error,
    )
    expect(error).toBeInstanceOf(Error)
    expect(files.removals).toEqual(files.puts)
  })
})
