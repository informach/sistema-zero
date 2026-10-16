import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { AssetLibraryPage } from '@sistemazero/marketing-contracts'
import { mergeMediaEntries, pollMediaLibrary } from '../src/media-library-state'

const projectId = randomUUID()
function entry(state: AssetLibraryPage['items'][number]['state'] = 'confirmed') {
  return {
    manifest: {
      schemaVersion: 1 as const,
      id: randomUUID(),
      projectId,
      name: 'original.txt',
      sha256: 'a'.repeat(64),
      size: 10,
      mime: 'text/plain' as const,
      role: 'original' as const,
      sourceAssetId: null,
      width: null,
      height: null,
      durationMs: null,
      codec: null,
      rotation: null,
    },
    state,
    error: null,
  }
}

test('an uploaded file outside page one stays visible and confirms without resetting pagination', async () => {
  const page: AssetLibraryPage = {
    items: Array.from({ length: 100 }, () => entry()),
    nextCursor: randomUUID(),
  }
  const uploaded = entry('verifying')
  const visible = mergeMediaEntries(page, [uploaded])
  let calls = 0
  const updates = await pollMediaLibrary(
    async (path, method, body) => {
      calls++
      expect(path).toBe(`/projects/${projectId}/assets/status`)
      expect(method).toBe('POST')
      expect(body).toEqual({ ids: [uploaded.manifest.id] })
      return { projectId, items: [{ ...uploaded, state: 'confirmed' }] }
    },
    projectId,
    visible,
  )
  const confirmed = mergeMediaEntries(visible, updates)
  expect(calls).toBe(1)
  expect(confirmed.items).toHaveLength(101)
  expect(confirmed.items[0]?.state).toBe('confirmed')
  expect(confirmed.nextCursor).toBe(page.nextCursor)
  expect(confirmed.items.slice(1)).toEqual(page.items)
})

test('failed network reads preserve all pending files for the next poll', async () => {
  const page = { items: [entry('verifying')], nextCursor: null }
  await expect(
    pollMediaLibrary(
      async () => {
        throw new Error('Offline')
      },
      projectId,
      page,
    ),
  ).rejects.toThrow('Offline')
  expect(page.items[0]?.state).toBe('verifying')
  const updates = await pollMediaLibrary(
    async () => ({
      projectId,
      items: [{ ...page.items[0], state: 'failed', error: 'Hash divergente' }],
    }),
    projectId,
    page,
  )
  const recovered = mergeMediaEntries(page, updates)
  expect(recovered.items[0]?.state).toBe('failed')
  expect(recovered.items[0]?.error).toBe('Hash divergente')
  await pollMediaLibrary(
    async () => {
      throw new Error('No terminal polling')
    },
    projectId,
    recovered,
  )
})

test('status lookup batches pending assets and rejects responses from another project', async () => {
  const page = { items: Array.from({ length: 201 }, () => entry('uploading')), nextCursor: null }
  let calls = 0
  await pollMediaLibrary(
    async () => {
      calls++
      return { projectId, items: [] }
    },
    projectId,
    page,
  )
  expect(calls).toBe(3)
  await expect(
    pollMediaLibrary(async () => ({ projectId: randomUUID(), items: [] }), projectId, page),
  ).rejects.toThrow('outro contexto')
  await expect(
    pollMediaLibrary(async () => ({ projectId, items: [entry()] }), projectId, page),
  ).rejects.toThrow('outro contexto')
})
