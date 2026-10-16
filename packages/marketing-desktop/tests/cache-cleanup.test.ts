import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  type AssetManifest,
  assetConfirmationRequestSchema,
} from '../../marketing-contracts/src/assets'
import { clearConfirmedAssets } from '../src/main/sync/clear-confirmed-cache'
import type { Asset } from '../src/shared/contracts'

test('205 cópias são conferidas em três consultas limitadas, sem baixar URLs por arquivo', async () => {
  const projectId = randomUUID(),
    files: Asset[] = Array.from({ length: 205 }, (_, index) => ({
      id: randomUUID(),
      name: `${index}.txt`,
      url: 'http://localhost/asset',
      mime: 'text/plain',
      sha256: 'a'.repeat(64),
      size: 1,
    })),
    byId = new Map(files.map((file) => [file.id, file])),
    removed: string[] = [],
    batches: number[] = []
  const result = await clearConfirmedAssets(
    {
      projectId,
      signal: new AbortController().signal,
      protectedIds: new Set(),
      assets: {
        list: () => files,
        async evict(id) {
          removed.push(id)
          return 1
        },
      },
      transport: {
        async request(route, method, raw) {
          expect(route).toBe(`/projects/${projectId}/assets/confirmed`)
          expect(method).toBe('POST')
          const { ids } = assetConfirmationRequestSchema.parse(raw)
          batches.push(ids.length)
          const manifests: AssetManifest[] = ids.map((id) => {
            const file = byId.get(id)
            if (!file) throw new Error('Pedido fora da seleção')
            return {
              schemaVersion: 1,
              id,
              projectId,
              name: file.name,
              sha256: file.sha256,
              size: file.size,
              mime: 'text/plain',
              role: 'original',
              sourceAssetId: null,
              width: null,
              height: null,
              durationMs: null,
              codec: null,
              rotation: null,
            }
          })
          return { projectId, manifests }
        },
      },
    },
    1000,
  )
  expect(batches).toEqual([100, 100, 5])
  expect(new Set(removed).size).toBe(205)
  expect(result).toEqual({ removed: 205, freedBytes: 205, preserved: 0, unavailable: 0 })
})

test('confirmação de outro projeto ou resposta duplicada não libera nenhuma cópia', async () => {
  const projectId = randomUUID(),
    file: Asset = {
      id: randomUUID(),
      name: 'x',
      size: 1,
      sha256: 'a'.repeat(64),
      url: 'http://localhost/asset',
      mime: 'text/plain',
    },
    manifest: AssetManifest = {
      schemaVersion: 1,
      id: file.id,
      projectId,
      name: file.name,
      sha256: file.sha256,
      size: file.size,
      mime: 'text/plain',
      role: 'original',
      sourceAssetId: null,
      width: null,
      height: null,
      durationMs: null,
      codec: null,
      rotation: null,
    }
  let removed = 0
  for (const response of [
    { projectId: randomUUID(), manifests: [manifest] },
    { projectId, manifests: [manifest, manifest] },
    { projectId, manifests: [{ ...manifest, id: randomUUID() }] },
    { projectId, manifests: [{ ...manifest, projectId: randomUUID() }] },
  ]) {
    await expect(
      clearConfirmedAssets({
        projectId,
        protectedIds: new Set(),
        signal: new AbortController().signal,
        assets: {
          list: () => [file],
          async evict() {
            removed++
            return 1
          },
        },
        transport: {
          async request() {
            return response
          },
        },
      }),
    ).rejects.toThrow('confirmação de arquivos inválida')
  }
  expect(removed).toBe(0)
})
