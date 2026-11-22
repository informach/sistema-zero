import { expect, test } from '@playwright/test'
import type { PintaCausalIntent, PintaCausalResult } from '@sistemazero/core/creations/pinta-causal'
import { openPintaAuthorityProof as proof } from './helpers/pintaAuthorityRealm'

declare global {
  interface Window {
    releaseCausalEditor?: () => void
  }
}

test('IndexedDB aborts the documents and outbox together, then reopens the whole edit', async ({
  page,
  context,
}) => {
  await proof(page)
  const saved = await page.evaluate(async () => {
    const p = window.pinta026,
      namespace = crypto.randomUUID(),
      persistence = p.createPintaCausalPersistence({ namespace })
    const sheet = p.createTilesetAsset({ name: 'peças', tileSize: 16 })
    sheet.tiles.push(structuredClone(sheet.tiles[0]!))
    sheet.solid.push(false)
    sheet.platform.push(false)
    const map = p.createTilemapAsset({ name: 'mapa', tilesetId: sheet.id, cols: 2, rows: 2 })
    map.layers[0]!.cells![0] = 1
    await persistence.persistAssets([sheet, map])
    const [a, b] = await persistence.causal.capture([sheet.id, map.id])
    if (a?.before?.kind !== 'tileset' || b?.before?.kind !== 'tilemap') throw Error('fixture')
    const next = structuredClone(b.before)
    next.layers[0]!.cells![0] = 0
    const opId = crypto.randomUUID()
    const draft: Parameters<typeof persistence.causal.stage>[0] = {
      opId,
      baseEpoch: '2',
      readSet: [{ source: 'unit', consumerId: map.id, targetId: sheet.id }],
      transitions: [
        {
          ...a,
          after: {
            ...a.before,
            tiles: a.before.tiles.slice(1),
            solid: a.before.solid.slice(1),
            platform: a.before.platform.slice(1),
          },
          baseRevision: 1,
          operation: { type: 'remap', oldToNew: [-1, 0], count: 1 },
        },
        { ...b, after: next, baseRevision: 1, operation: { type: 'update' } },
      ],
    }
    const original = IDBObjectStore.prototype.put
    let failed = false
    IDBObjectStore.prototype.put = function (value, key) {
      if (key === `pinta:asset:${map.id}`) throw Error('prova de aborto causal')
      return original.call(this, value, key)
    }
    try {
      await persistence.causal.stage(draft)
    } catch (error) {
      failed = String(error).includes('prova de aborto causal')
    } finally {
      IDBObjectStore.prototype.put = original
    }
    const afterFailure = await persistence.causal.capture([sheet.id, map.id])
    const pendingAfterFailure = (await persistence.causal.inspect()).pending.length
    await persistence.causal.stage(draft)
    const guarded = await persistence.persistAsset(next).then(
      () => false,
      (error) => String(error).includes('guardadas juntas'),
    )
    return {
      namespace,
      opId,
      sheetId: sheet.id,
      mapId: map.id,
      failed,
      guarded,
      sameRevisions: [a, b].every(
        (base, index) => base.beforeRevision === afterFailure[index]?.beforeRevision,
      ),
      pendingAfterFailure,
    }
  })
  expect(saved).toMatchObject({
    failed: true,
    guarded: true,
    sameRevisions: true,
    pendingAfterFailure: 0,
  })
  await page.close()
  const reopened = await context.newPage()
  await proof(reopened)
  expect(
    await reopened.evaluate(async ({ namespace, opId, sheetId, mapId }) => {
      const p = window.pinta026
      const persistence = p.createPintaCausalPersistence({ namespace })
      const restored = await persistence.causal.prepare(opId)
      const sheet = restored?.assets.find((a) => a.id === sheetId),
        map = restored?.assets.find((a) => a.id === mapId)
      const other = p.createPintaCausalPersistence({ namespace: `outro-${namespace}` })
      return {
        tiles: sheet?.kind === 'tileset' ? sheet.tiles.length : null,
        cell: map?.kind === 'tilemap' ? map.layers[0]?.cells?.[0] : null,
        pending: restored?.pending.members.length,
        otherProfile: (await other.causal.inspect()).pending.length,
      }
    }, saved),
  ).toEqual({ tiles: 1, cell: 0, pending: 2, otherProfile: 0 })
})

test('a sealed IndexedDB upload survives restart and acknowledges only the original local revision', async ({
  page,
  context,
}) => {
  await proof(page)
  const staged = await page.evaluate(async () => {
    const p = window.pinta026,
      namespace = crypto.randomUUID(),
      persistence = p.createPintaCausalPersistence({ namespace })
    const sprite = p.createPixelSpriteAsset({ name: 'original', frameSize: 8 })
    await persistence.persistAsset(sprite)
    const [base] = await persistence.causal.capture([sprite.id])
    if (!base?.before) throw Error('fixture')
    const opId = crypto.randomUUID()
    const after = { ...base.before, name: 'em-envio' }
    const pending = await persistence.causal.stage({
      opId,
      baseEpoch: '3',
      readSet: [],
      transitions: [{ ...base, after, baseRevision: 1, operation: { type: 'update' } }],
    })
    const gzip = await new Response(
      new Blob([after.name]).stream().pipeThrough(new CompressionStream('gzip')),
    ).blob()
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', await gzip.arrayBuffer()))
    const sha256 = [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('')
    const intent = {
      protocol: 1,
      opId,
      baseEpoch: '3',
      reader: 6,
      readSet: [],
      members: [
        {
          action: 'put',
          itemId: sprite.id,
          baseRevision: 1,
          name: after.name,
          kind: sprite.kind,
          itemUpdatedAt: new Date(sprite.updatedAt).toISOString(),
          formatVersion: 1,
          bytes: gzip.size,
          sha256,
          operation: { type: 'update' },
        },
      ],
    } satisfies PintaCausalIntent
    const intentHash = 'b'.repeat(64)
    if (
      !(await persistence.causal.seal(
        pending.preparation,
        intent,
        intentHash,
        new Map([[sprite.id, gzip]]),
      ))
    )
      throw Error('not sealed')
    const [nextBase] = await persistence.causal.capture([sprite.id])
    if (!nextBase?.before) throw Error('fixture')
    await persistence.causal.stage({
      opId: crypto.randomUUID(),
      baseEpoch: '3',
      readSet: [],
      transitions: [
        {
          ...nextBase,
          after: { ...nextBase.before, name: 'edicao-posterior' },
          baseRevision: 1,
          operation: { type: 'update' },
        },
      ],
    })
    return {
      namespace,
      id: sprite.id,
      sentRevision: pending.members[0]?.localRevision,
      receipt: {
        opId,
        epoch: '4',
        intentHash,
        members: [{ itemId: sprite.id, revision: 2, deleted: false, sha256, layoutRevision: null }],
      } satisfies PintaCausalResult,
    }
  })
  await page.close()
  const reopened = await context.newPage()
  await proof(reopened)
  const result = await reopened.evaluate(async ({ namespace, id, receipt }) => {
    const persistence = window.pinta026.createPintaCausalPersistence({ namespace })
    const upload = await persistence.causal.inFlight()
    const blob = upload?.blobs.get(id)
    if (!blob) throw Error('upload missing on reopen')
    const sentText = await new Response(
      blob.stream().pipeThrough(new DecompressionStream('gzip')),
    ).text()
    const bad = { ...receipt, intentHash: 'c'.repeat(64) }
    const refused = await persistence.causal.acknowledge(bad).then(
      () => false,
      () => true,
    )
    const acknowledged = await persistence.causal.acknowledge(receipt)
    const { confirmed, pending } = await persistence.causal.inspect()
    const current = await persistence.loadAssetById(id)
    return {
      sentText,
      refused,
      acknowledged,
      current: current?.name,
      confirmed: confirmed.get(id)?.localRevision,
      successor: pending[0]?.members[0]?.localRevision,
      noUpload: (await persistence.causal.inFlight()) === null,
    }
  }, staged)
  expect(result).toMatchObject({
    sentText: 'em-envio',
    refused: true,
    acknowledged: true,
    current: 'edicao-posterior',
    confirmed: staged.sentRevision,
    noUpload: true,
  })
  expect(result.successor).not.toBe(result.confirmed)
})

test('an editor in another tab defers the complete delta before the final local CAS', async ({
  page,
  context,
}) => {
  await proof(page)
  const initial = await page.evaluate(async () => {
    const p = window.pinta026
    const namespace = crypto.randomUUID()
    const local = p.createPintaCausalPersistence({ namespace })
    const assets = ['vila', 'cabana'].map((name) =>
      p.createPixelSpriteAsset({ name, frameSize: 8 }),
    )
    const installed = await local.causal.applyPull(
      {
        fromEpoch: null,
        epoch: '3',
        transitions: assets.map((asset) => ({
          id: asset.id,
          before: null,
          beforeRevision: null,
          after: asset,
          remote: { revision: 1, sha256: 'a'.repeat(64), layoutRevision: null },
        })),
      },
      () => true,
    )
    if (!installed) throw Error('fixture')
    return { namespace, ids: assets.map((asset) => asset.id) }
  })
  const otherTab = await context.newPage()
  await proof(otherTab)
  await otherTab.evaluate(async ({ namespace, ids }) => {
    window.releaseCausalEditor = await window.pintaPhysicalRegions.holdPintaEditorLock(
      namespace,
      ids[0]!,
    )
  }, initial)

  const attemptDelta = (fromEpoch = '3', epoch = '4', race = false) =>
    page.evaluate(
      async ({ namespace, ids, fromEpoch, epoch, race }) => {
        const local = window.pinta026.createPintaCausalPersistence({ namespace })
        const transitions = (await local.causal.capture(ids)).map((base) => {
          if (!base.before) throw Error('fixture')
          return {
            ...base,
            after: { ...base.before, name: `${base.before.name}-nova` },
            remote: { revision: 2, sha256: 'b'.repeat(64), layoutRevision: null },
          }
        })
        const latest = transitions.at(-1)?.before
        if (race && latest) await local.persistAsset({ ...latest, name: 'edicao-local' })
        const applied = await window.pintaPhysicalRegions
          .withClosedPintaEditors(namespace, ids, () =>
            local.causal.applyPull({ fromEpoch, epoch, transitions }, () => true),
          )
          .catch((error) => {
            if (race && String(error).includes('Um dos desenhos mudou')) return false
            throw error
          })
        const names = (await local.listAllAssets()).map((asset) => asset.name).sort()
        return { applied, names, epoch: (await local.causal.inspect()).epoch }
      },
      { ...initial, fromEpoch, epoch, race },
    )
  expect(await attemptDelta()).toEqual({ applied: false, names: ['cabana', 'vila'], epoch: '3' })
  await otherTab.evaluate(() => window.releaseCausalEditor?.())
  await expect
    .poll(attemptDelta)
    .toEqual({ applied: true, names: ['cabana-nova', 'vila-nova'], epoch: '4' })
  const raced = await attemptDelta('4', '5', true)
  expect(raced.applied).toBe(false)
  expect(raced.epoch).toBe('4')
  expect(raced.names).toContain('edicao-local')
  expect(raced.names.some((name) => name.endsWith('-nova-nova'))).toBe(false)
})
