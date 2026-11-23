import { expect, test } from 'bun:test'
import '../../../pinta/src/testing/idbMock'
import type { PintaCausalEntry } from '@sistemazero/core/creations/pinta-causal'
import { createWorkshopPintaPersistence } from '@sistemazero/pinta/workshop-reader'
import {
  attachWorkshopBook,
  pintaWorkshopAssetToJson,
} from '../../../pinta/src/export/workshopDocument'
import { automapFixture } from '../../../pinta/src/testing/automapFixture'
import { nativeNineGallery } from '../../../pinta/src/testing/nativeNineFixtures'
import { createCreationsCloud } from '../../src/lib/creations-cloud'
import { decodeCausalEntry } from '../../src/lib/pinta-causal-pull'
import { createCloudMirroredPintaPersistence } from '../../src/lib/pinta-cloud-persistence'

test('reader A abre a autoria, guarda o grupo no aparelho antes do primeiro epoch e recusa confirmar pelo protocolo antigo', async () => {
  const { map, sheet, book } = await automapFixture()
  const doc = attachWorkshopBook(map, book)!
  const namespace = crypto.randomUUID(),
    local = createWorkshopPintaPersistence({ namespace, guardCausalWrites: true })
  const requests: string[] = []
  const cloud = createCreationsCloud({
    tool: 'pinta',
    viewerId: crypto.randomUUID(),
    audience: 'kids',
    maxFormatVersion: 6,
    pintaCausalReader: 8,
    pintaCausalEnabled: true,
    fetch: async (input) => {
      requests.push(String(input))
      return new Response(null, { status: 404 })
    },
  })
  if (!cloud.pintaCausal) throw Error('sem transporte')
  const persistence = createCloudMirroredPintaPersistence({
    viewerId: namespace,
    localNamespace: namespace,
    local,
    cloud,
    causal: {
      local: local.causal,
      reader: 8,
      writer: 6,
      holdOpen: async () => () => {},
      withClosed: (_, apply) => apply(),
    },
  })
  try {
    await persistence.persistAssets([sheet, doc])
    expect(persistence.workshopReader).toBe(true)
    const state = await local.causal.inspect()
    const shadow = await local.causal.retained(state.unbased!.opId)
    expect(shadow?.puts.find((p) => p.itemId === map.id)?.formatVersion).toBe(8)
    const fresh = createWorkshopPintaPersistence({ namespace, guardCausalWrites: true })
    expect(await fresh.loadAssetById(map.id)).toMatchObject({ schema: 9, automapping: book })
    const text = pintaWorkshopAssetToJson(doc)!
    const entry: PintaCausalEntry = {
      itemId: map.id,
      kind: map.kind,
      name: map.name,
      itemUpdatedAt: new Date(map.updatedAt).toISOString(),
      bytes: text.length,
      formatVersion: 8,
      revision: 1,
      layoutRevision: null,
      sha256: 'a'.repeat(64),
      coverage: 'certified',
    }
    expect(decodeCausalEntry(text, entry, fresh.causal.decodeCandidate)).toMatchObject({
      schema: 9,
      automapping: book,
    })
    expect(
      decodeCausalEntry(text, { ...entry, formatVersion: 6 }, fresh.causal.decodeCandidate),
    ).toBeNull()
    expect(
      decodeCausalEntry(
        text,
        { ...entry, itemUpdatedAt: new Date(0).toISOString() },
        fresh.causal.decodeCandidate,
      ),
    ).toBeNull()
    await expect(persistence.accountConfirmation!.confirm(map.id)).rejects.toThrow()
    expect(requests.every((url) => url.includes('/graph?reader=8'))).toBe(true)
    expect((await fresh.causal.inspect()).unbased?.opId).toBe(state.unbased?.opId)
  } finally {
    persistence.dispose?.()
    cloud.dispose({ abort: true })
  }
})

test('reader A guarda pela conta os mapas projetados e o pull os decodifica com os mesmos bytes', async () => {
  const { sheet, hex, iso } = await nativeNineGallery()
  const namespace = crypto.randomUUID(),
    local = createWorkshopPintaPersistence({ namespace, guardCausalWrites: true })
  const cloud = createCreationsCloud({
    tool: 'pinta',
    viewerId: crypto.randomUUID(),
    audience: 'kids',
    maxFormatVersion: 6,
    pintaCausalReader: 8,
    pintaCausalEnabled: true,
    fetch: async () => new Response(null, { status: 404 }),
  })
  if (!cloud.pintaCausal) throw Error('sem transporte')
  const persistence = createCloudMirroredPintaPersistence({
    viewerId: namespace,
    localNamespace: namespace,
    local,
    cloud,
    causal: {
      local: local.causal,
      reader: 8,
      writer: 6,
      holdOpen: async () => () => {},
      withClosed: (_, apply) => apply(),
    },
  })
  try {
    await persistence.persistAssets([sheet, hex, iso])
    const state = await local.causal.inspect()
    const shadow = await local.causal.retained(state.unbased!.opId)
    const fresh = createWorkshopPintaPersistence({ namespace, guardCausalWrites: true })
    for (const map of [hex, iso]) {
      const text = pintaWorkshopAssetToJson(map)!
      expect(shadow?.puts.find((p) => p.itemId === map.id)?.formatVersion).toBe(8)
      const gzip = shadow?.blobs.get(map.id)
      if (!gzip) throw Error('sombra sem o mapa projetado')
      expect(
        await new Response(gzip.stream().pipeThrough(new DecompressionStream('gzip'))).text(),
      ).toBe(text)
      const reopened = await fresh.loadAssetById(map.id)
      expect(reopened && pintaWorkshopAssetToJson(reopened)).toBe(text)
      const entry: PintaCausalEntry = {
        itemId: map.id,
        kind: map.kind,
        name: map.name,
        itemUpdatedAt: new Date(map.updatedAt).toISOString(),
        bytes: text.length,
        formatVersion: 8,
        revision: 1,
        layoutRevision: null,
        sha256: 'b'.repeat(64),
        coverage: 'certified',
      }
      const pulled = decodeCausalEntry(text, entry, fresh.causal.decodeCandidate)
      expect(pulled && pintaWorkshopAssetToJson(pulled)).toBe(text)
      expect(
        decodeCausalEntry(text, { ...entry, formatVersion: 6 }, fresh.causal.decodeCandidate),
      ).toBeNull()
    }
  } finally {
    persistence.dispose?.()
    cloud.dispose({ abort: true })
  }
})
