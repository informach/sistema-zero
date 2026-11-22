import { expect, it } from 'bun:test'
import type { PintaCausalEntry } from '@sistemazero/core/creations/pinta-causal'
import { assetToJson } from '@sistemazero/pinta/assets'
import { createPixelSpriteAsset } from '../../pinta/src/core/project'
import { discoverPintaCausalSnapshot, pullPintaCausalSnapshot } from '../src/lib/pinta-causal-pull'

it('only an account that has never seen the protocol can fall back after 404', async () => {
  const signal = new AbortController().signal
  let protocolKnown = false
  let available = false
  const probe = () =>
    discoverPintaCausalSnapshot({
      signal,
      local: {
        inspect: async () => ({
          version: 1,
          protocolKnown,
          epoch: null,
          pending: [],
          sealed: null,
          confirmed: new Map(),
        }),
        rememberProtocol: async () => {
          protocolKnown = true
        },
      },
      cloud: {
        snapshot: async () => (available ? { epoch: '1', requiredFormat: 6, entries: [] } : null),
      },
    })
  await expect(probe()).resolves.toBeNull()
  available = true
  await expect(probe()).resolves.toMatchObject({ epoch: '1' })
  available = false
  await expect(probe()).rejects.toMatchObject({ reason: 'protocol-required' })
})

it('a corrupt second member cannot apply or confirm any page of the pull', async () => {
  const assets = ['cabana', 'vila'].map((name) => createPixelSpriteAsset({ name, frameSize: 8 }))
  const gzip = await new Response(
    new Blob([assetToJson(assets[0]!)]).stream().pipeThrough(new CompressionStream('gzip')),
  ).arrayBuffer()
  const entries = assets.map(
    ({ id, kind, name, updatedAt }): PintaCausalEntry => ({
      itemId: id,
      kind,
      name,
      itemUpdatedAt: new Date(updatedAt).toISOString(),
      formatVersion: 1,
      revision: 1,
      sha256: null,
      layoutRevision: null,
      bytes: gzip.byteLength,
      coverage: 'unknown',
    }),
  )
  const downloaded: string[] = []
  let applied = false
  let verified = false
  const signal = new AbortController().signal
  const result = await pullPintaCausalSnapshot({
    snapshot: { epoch: '2', requiredFormat: 6, entries },
    signal,
    local: {
      inspect: async () => ({
        version: 1,
        protocolKnown: true,
        epoch: '1',
        pending: [],
        sealed: null,
        confirmed: new Map(),
      }),
      capture: async (ids) => ids.map((id) => ({ id, before: null, beforeRevision: null })),
      pullImpact: async () => ({ ids: [], blocked: false }),
      applyPull: async () => {
        applied = true
        return true
      },
    },
    cloud: {
      download: async (entry) => {
        downloaded.push(entry.itemId)
        // The second blob decodes successfully, but is a different native drawing.
        return new Uint8Array(gzip)
      },
      verifyEpoch: async () => {
        verified = true
      },
    },
    isOpen: () => false,
    withClosed: (_, apply) => apply(),
  })
  expect(result).toBe(false)
  expect(downloaded).toEqual(assets.map((asset) => asset.id))
  expect(applied).toBe(false)
  expect(verified).toBe(false)
})
