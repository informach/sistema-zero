import { expect, it } from 'bun:test'
import type { PintaCausalEntry, PintaCausalIntent } from '@sistemazero/core/creations/pinta-causal'
import { createPintaCausalCloud } from '../src/lib/pinta-causal-cloud'

const epoch = '8'
const scope = { viewerId: 'perfil', audience: 'kids', reader: 6 } as const
const timestamp = '2026-11-22T12:00:00Z'
const opId = 'd1b1d364-08d2-427b-ad93-182773629af3'
const sha256 = 'a'.repeat(64)
const intentHash = 'b'.repeat(64)

function entry(itemId: string): PintaCausalEntry {
  return {
    itemId,
    revision: 1,
    name: itemId,
    kind: 'tilemap',
    formatVersion: 6,
    layoutRevision: null,
    sha256,
    bytes: 20,
    itemUpdatedAt: timestamp,
    coverage: 'certified',
  }
}

it('pins every graph page to the same epoch and rejects a partial snapshot', async () => {
  const calls: string[] = []
  const cloud = createPintaCausalCloud({
    ...scope,
    signal: new AbortController().signal,
    fetch: async (input, init) => {
      const path = String(input)
      calls.push(path)
      expect(new Headers(init?.headers).get('x-sz-viewer')).toBe(scope.viewerId)
      expect(new Headers(init?.headers).get('x-sz-viewer-audience')).toBe(scope.audience)
      return Response.json({
        protocol: 1,
        epoch: calls.length === 1 ? epoch : '9',
        requiredFormat: 6,
        entries: [entry(calls.length === 1 ? 'a' : 'b')],
        nextCursor: calls.length === 1 ? 'a' : null,
      })
    },
  })
  await expect(cloud.snapshot()).rejects.toMatchObject({ reason: 'invalid-proof' })
  expect(calls).toEqual([
    '/api/pinta/causal/graph?reader=6',
    '/api/pinta/causal/graph?reader=6&epoch=8&cursor=a',
  ])
})

it('reuses an existing write-once PUT, verifies every member, then recovers the same receipt', async () => {
  const blob = new Blob(['pinta'])
  const intent = {
    protocol: 1,
    opId,
    baseEpoch: epoch,
    reader: 6,
    readSet: [],
    members: [
      { action: 'delete', itemId: 'a', baseRevision: 1 },
      {
        action: 'put',
        itemId: 'b',
        baseRevision: 1,
        kind: 'tilemap',
        name: 'b',
        formatVersion: 6,
        itemUpdatedAt: timestamp,
        bytes: blob.size,
        sha256,
        operation: { type: 'update' },
      },
    ],
  } satisfies PintaCausalIntent
  const upload = { intent, intentHash, blobs: new Map([['b', blob]]) }
  const result = {
    opId,
    intentHash,
    epoch: '9',
    members: [
      { itemId: 'a', revision: 2, deleted: true, sha256: null, layoutRevision: null },
      { itemId: 'b', revision: 2, deleted: false, sha256, layoutRevision: null },
    ],
  }
  const calls: string[] = []
  let committed = false
  let loseCommitResponse = true
  const cloud = createPintaCausalCloud({
    ...scope,
    signal: new AbortController().signal,
    fetch: async (input, init) => {
      const path = String(input)
      calls.push(path)
      if (path.endsWith('/units/reserve')) {
        expect(JSON.parse(String(init?.body))).toMatchObject({
          opId,
          intentHash,
          members: intent.members,
        })
        return Response.json({
          state: 'reserved',
          opId,
          intentHash,
          nextCursor: null,
          tickets: [
            { itemId: 'a', revision: 2 },
            {
              itemId: 'b',
              revision: 2,
              bytes: blob.size,
              uploadUrl: 'https://storage.invalid/b',
              method: 'PUT',
              headers: { 'if-none-match': '*', 'content-type': 'application/gzip' },
            },
          ],
        })
      }
      if (path.endsWith('/verify')) {
        const member = JSON.parse(String(init?.body))
        calls[calls.length - 1] = String(member.itemId)
        return Response.json({ verified: true })
      }
      if (path === 'https://storage.invalid/b') {
        expect(init?.credentials).toBe('omit')
        expect(new Headers(init?.headers).get('if-none-match')).toBe('*')
        expect(init?.body).toBe(blob)
        return new Response(null, { status: 412 })
      }
      if (path.endsWith('/commit')) {
        committed = true
        if (loseCommitResponse) throw Error('resposta perdida depois do commit')
        return Response.json({ state: 'committed', result })
      }
      return committed
        ? Response.json({ state: 'committed', result })
        : new Response(null, { status: 404 })
    },
  })
  await expect(cloud.upload(upload)).rejects.toThrow('resposta perdida')
  await expect(cloud.upload(upload)).resolves.toEqual(result)
  expect(calls).toEqual([
    `/api/pinta/causal/units/${opId}`,
    '/api/pinta/causal/units/reserve',
    'a',
    'https://storage.invalid/b',
    'b',
    `/api/pinta/causal/units/${opId}/commit`,
    `/api/pinta/causal/units/${opId}`,
  ])
  committed = false
  loseCommitResponse = false
  await expect(cloud.upload(upload)).resolves.toEqual(result)
})

it('stops a retired profile before accepting a late response', async () => {
  let respond: (response: Response) => void = () => {}
  const pending = new Promise<Response>((resolve) => {
    respond = resolve
  })
  const controller = new AbortController()
  const cloud = createPintaCausalCloud({
    ...scope,
    signal: controller.signal,
    fetch: async () => pending,
  })
  const reading = cloud.snapshot()
  controller.abort()
  respond(Response.json({ protocol: 1, epoch, requiredFormat: 6, entries: [], nextCursor: null }))
  await expect(reading).rejects.toMatchObject({ name: 'AbortError' })
})
