import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { gunzipSync } from 'node:zlib'
import { expect, test } from '@playwright/test'
import type { PintaCausalIntent, PintaCausalResult } from '@sistemazero/core/creations/pinta-causal'
import { unzipSync } from 'fflate'
import { openPintaAuthorityProof as proof } from './helpers/pintaAuthorityRealm'

declare global {
  interface Window {
    releaseCausalEditor?: () => void
    pintaCausalRecovery: typeof import('../../pinta/scripts/causal-recovery-proof')
    mountPintaRecoveryGallery(namespace: string): void
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

test('three local candidates survive beside one remote seal, with atomic quota and receipt order', async ({
  page,
  context,
}) => {
  await proof(page)
  const staged = await page.evaluate(async () => {
    const p = window.pinta026
    const namespace = crypto.randomUUID()
    const { causal } = p.createPintaCausalPersistence({ namespace })
    const sprite = p.createPixelSpriteAsset({ name: 'nuvem', frameSize: 8 })
    await causal.applyPull({ fromEpoch: null, epoch: '1', transitions: [] }, () => true)
    let predecessor: { opId: string; localRevision: string; sha256: string } | undefined
    const orderedIds: string[] = []
    let failedLastWrite = false
    let refusedQuota = false
    for (let i = 0; i < 4; i++) {
      const [base] = await causal.capture([sprite.id])
      if (!base) throw Error('Base absent')
      const after = { ...(base.before ?? sprite), name: `camada-${i}` }
      const opId = crypto.randomUUID()
      orderedIds.push(opId)
      const staged = await causal.stage({
        opId,
        baseEpoch: '1',
        readSet: [],
        ...(predecessor ? { follows: predecessor.opId } : {}),
        transitions: [
          {
            ...base,
            after,
            baseRevision: 0,
            operation: { type: i === 0 ? 'create' : 'update' },
            ...(predecessor ? { baseAfter: predecessor } : {}),
          },
        ],
      })
      const gzip = await new Response(
        new Blob([after.name]).stream().pipeThrough(new CompressionStream('gzip')),
      ).blob()
      const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', await gzip.arrayBuffer()))
      const sha256 = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
      const put = {
        itemId: sprite.id,
        bytes: gzip.size,
        sha256,
        kind: sprite.kind,
        name: after.name,
        itemUpdatedAt: new Date(sprite.updatedAt).toISOString(),
        formatVersion: 1,
      }
      const blobs = new Map([[sprite.id, gzip]])
      const member = staged.members[0]
      if (!member) throw Error('Candidate absent')
      predecessor = { opId, localRevision: member.localRevision, sha256 }
      if (i === 0) {
        const intent: PintaCausalIntent = {
          opId,
          protocol: 1,
          reader: 6,
          baseEpoch: '1',
          readSet: [],
          members: [{ ...put, action: 'put', operation: { type: 'create' }, baseRevision: 0 }],
        }
        if (!(await causal.seal(staged.preparation, intent, '1'.repeat(64), blobs)))
          throw Error('Seal refused')
        continue
      }
      if (i === 3) {
        const large = new Blob([new Uint8Array(32 * 1024 * 1024)])
        refusedQuota = await causal
          .freeze(
            opId,
            staged.preparation,
            [{ ...put, bytes: large.size }],
            new Map([[sprite.id, large]]),
          )
          .then(
            () => false,
            (error) => String(error).includes('espaço') || String(error).includes('MiB'),
          )
        const original = IDBObjectStore.prototype.put
        IDBObjectStore.prototype.put = function (value, key) {
          if (key === `pinta:sync:prepared:${opId}`) throw Error('último registro preparado')
          return original.call(this, value, key)
        }
        try {
          await causal.freeze(opId, staged.preparation, [put], blobs)
        } catch (error) {
          failedLastWrite = String(error).includes('último registro preparado')
        } finally {
          IDBObjectStore.prototype.put = original
        }
        if (await causal.prepared(opId)) throw Error('Partial write appeared')
      }
      if (!(await causal.freeze(opId, staged.preparation, [put], blobs)))
        throw Error('Preparation refused')
    }
    const state = await causal.inspect()
    return {
      namespace,
      itemId: sprite.id,
      orderedIds,
      failedLastWrite,
      refusedQuota,
      localCandidates: state.prepared?.size,
      activeId: state.sealed?.local.opId,
    }
  })
  expect(staged).toMatchObject({
    failedLastWrite: true,
    refusedQuota: true,
    localCandidates: 3,
    activeId: staged.orderedIds[0],
  })
  await page.close()
  const reopened = await context.newPage()
  await proof(reopened)
  const finished = await reopened.evaluate(async ({ namespace, itemId, orderedIds }) => {
    const { causal } = window.pinta026.createPintaCausalPersistence({ namespace })
    const order: string[] = []
    const texts: string[] = []
    for (let i = 0; i < orderedIds.length; i++) {
      const opId = orderedIds[i]!
      if (i > 0) {
        const head = (await causal.inspect()).pending[0]
        const candidate = await causal.prepared(opId)
        const put = candidate?.puts[0]
        if (
          !head ||
          head.opId !== opId ||
          !candidate ||
          !put ||
          head.follows ||
          head.baseEpoch !== String(i + 1) ||
          head.members[0]?.baseRevision !== i
        )
          throw Error('Unproven successor')
        const intent: PintaCausalIntent = {
          opId,
          protocol: 1,
          reader: 6,
          baseEpoch: head.baseEpoch,
          readSet: [],
          members: [{ ...put, action: 'put', baseRevision: i, operation: { type: 'update' } }],
        }
        if (!(await causal.seal(head.preparation, intent, '2'.repeat(64), candidate.blobs)))
          throw Error('Frozen candidate disappeared')
      }
      const upload = await causal.inFlight()
      const member = upload?.sealed.intent.members[0]
      const blob = upload?.blobs.get(itemId)
      if (!upload || !blob || member?.action !== 'put') throw Error('Gzip absent')
      texts.push(
        await new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).text(),
      )
      order.push(upload.sealed.intent.opId)
      if (
        !(await causal.acknowledge({
          opId,
          epoch: String(i + 2),
          intentHash: upload.sealed.intentHash,
          members: [
            {
              itemId,
              revision: i + 1,
              deleted: false,
              sha256: member.sha256,
              layoutRevision: null,
            },
          ],
        }))
      )
        throw Error('ACK did not settle')
    }
    const final = await causal.inspect()
    return {
      order,
      texts,
      epoch: final.epoch,
      writeEpoch: final.writeEpoch,
      pending: final.pending.length,
      prepared: final.prepared?.size,
      sealed: final.sealed,
    }
  }, staged)
  expect(finished).toEqual({
    order: staged.orderedIds,
    texts: ['camada-0', 'camada-1', 'camada-2', 'camada-3'],
    epoch: '1',
    writeEpoch: '5',
    pending: 0,
    prepared: 0,
    sealed: null,
  })
})

test('terminal snapshot keeps seal and prepared Blobs until the complete copy commits', async ({
  page,
  context,
}) => {
  await proof(page)
  const work = await page.evaluate(async () => {
    const p = window.pinta026
    const namespace = crypto.randomUUID()
    const { causal } = p.createPintaCausalPersistence({ namespace })
    const first = p.createPixelSpriteAsset({ name: 'conta', frameSize: 8 })
    const id = first.id
    const remote = { revision: 1, sha256: 'a'.repeat(64), layoutRevision: null }
    await causal.applyPull(
      {
        fromEpoch: null,
        epoch: '1',
        transitions: [{ id, before: null, beforeRevision: null, after: first, remote }],
      },
      () => true,
    )
    const [base] = await causal.capture([id])
    if (!base?.before) throw Error('Documento ausente')
    const opId = crypto.randomUUID()
    const intentHash = 'b'.repeat(64)
    const firstEdit = { ...base.before, name: 'rascunho' }
    const signal = new AbortController().signal
    const shadow = await causal.encodeCandidates([firstEdit], signal)
    const candidate = shadow.puts[0]!
    const sealed = await causal.stage({
      opId,
      baseEpoch: '1',
      shadow,
      readSet: [],
      transitions: [
        {
          ...base,
          after: firstEdit,
          baseRevision: 1,
          operation: { type: 'update' },
        },
      ],
    })
    const intent: PintaCausalIntent = {
      protocol: 1,
      reader: 6,
      baseEpoch: '1',
      opId,
      readSet: [],
      members: [{ ...candidate, action: 'put', baseRevision: 1, operation: { type: 'update' } }],
    }
    if (!(await causal.seal(sealed.preparation, intent, intentHash, shadow.blobs)))
      throw Error('Selo ausente')
    const [nextBase] = await causal.capture([id])
    if (!nextBase?.before) throw Error('Documento ausente')
    const secondEdit = { ...nextBase.before, name: 'minha-edicao' }
    const nextShadow = await causal.encodeCandidates([secondEdit], signal)
    const next = await causal.stage({
      opId: crypto.randomUUID(),
      baseEpoch: '1',
      follows: opId,
      shadow: nextShadow,
      readSet: [],
      transitions: [
        {
          ...nextBase,
          after: secondEdit,
          baseRevision: 1,
          operation: { type: 'update' },
          baseAfter: {
            opId,
            sha256: candidate.sha256,
            localRevision: sealed.members[0]!.localRevision,
          },
        },
      ],
    })
    if (!(await causal.freeze(next.opId, next.preparation, nextShadow.puts, nextShadow.blobs)))
      throw Error('Sucessor ausente')
    return {
      namespace,
      id,
      opId,
      intentHash,
      pending: [{ opId: next.opId, preparation: next.preparation }],
    }
  })
  const other = await context.newPage()
  await proof(other, 'pre-causal')
  await other.evaluate(async ({ namespace, id }) => {
    const legacy = window.pinta026.createPintaPersistence({ namespace })
    const observed = await legacy.loadAssetById(id)
    if (observed?.name !== 'minha-edicao') throw Error('O escritor anterior não viu o mesmo banco')
    await legacy.persistAsset({ ...observed, name: 'outra-instalacao' })
  }, work)
  await proof(other)
  await other.evaluate(async ({ namespace, id }) => {
    window.releaseCausalEditor = await window.pintaPhysicalRegions.holdPintaEditorLock(
      namespace,
      id,
    )
  }, work)
  async function recover(interrupt = false) {
    return page.evaluate(
      async ({ namespace, id, opId, intentHash, pending, interrupt }) => {
        const p = window.pinta026
        const local = p.createPintaCausalPersistence({ namespace })
        const [base] = await local.causal.capture([id])
        if (base?.before?.name !== 'outra-instalacao')
          throw Error('A edição da outra instalação não chegou ao mesmo banco')
        async function decode(blob: Blob) {
          const json = await new Response(
            blob.stream().pipeThrough(new DecompressionStream('gzip')),
          ).text()
          const asset = local.causal.decodeCandidate(json)
          if (!asset) throw Error('Arquivo durável inválido')
          return asset
        }
        const sealed = await local.causal.inFlight()
        const successor = await local.causal.prepared(pending[0]!.opId)
        if (!sealed || !successor) throw Error('Arquivos duráveis ausentes')
        const stateBefore = await local.causal.inspect()
        const firstPut = sealed.sealed.intent.members[0]!
        if (firstPut.action !== 'put') throw Error('PUT em voo ausente')
        const archived = [
          {
            opId,
            localRevision: sealed.sealed.local.members[0]!.localRevision,
            sha256: firstPut.sha256,
            asset: await decode(sealed.blobs.get(id)!),
          },
          {
            opId: pending[0]!.opId,
            localRevision: stateBefore.pending[0]!.members[0]!.localRevision,
            sha256: successor.puts[0]!.sha256,
            asset: await decode(successor.blobs.get(id)!),
          },
        ]
        const pull = {
          fromEpoch: '1',
          epoch: '2',
          archived,
          transitions: [
            {
              ...base,
              after: { ...base.before, name: 'da-conta-agora' },
              remote: { revision: 2, sha256: 'e'.repeat(64), layoutRevision: null },
            },
          ],
          recoverUnit: { opId, intentHash, pending, terminal: 'unknown' as const },
        }
        const impact = await local.causal.pullImpact(pull)
        const put = IDBObjectStore.prototype.put
        if (interrupt)
          IDBObjectStore.prototype.put = function (value, key) {
            if (
              typeof key === 'string' &&
              key.startsWith('pinta:asset:') &&
              value &&
              typeof value === 'object' &&
              'name' in value &&
              value.name === 'minha-edicao-copia'
            )
              throw Error('Última cópia interrompida')
            return put.call(this, value, key)
          }
        let applied = false
        let failed = false
        try {
          applied = await window.pintaPhysicalRegions.withClosedPintaEditors(
            namespace,
            impact.ids,
            () => local.causal.applyPull({ ...pull, coveredIds: impact.ids }, () => true),
          )
        } catch (error) {
          if (!String(error).includes('Última cópia interrompida')) throw error
          failed = true
        } finally {
          IDBObjectStore.prototype.put = put
        }
        const state = await local.causal.inspect()
        const queued = await local.causal.prepared(pending[0]!.opId)
        const stored = queued?.blobs.get(id)
        return {
          applied,
          failed,
          epoch: state.epoch,
          opId: state.sealed?.intent.opId,
          prepared: stored ? (await decode(stored)).name : undefined,
          names: (await local.listAllAssets()).map(({ name }) => name).sort(),
        }
      },
      { ...work, interrupt },
    )
  }
  expect(await recover()).toMatchObject({
    applied: false,
    failed: false,
    epoch: '1',
    opId: work.opId,
    prepared: 'minha-edicao',
    names: ['outra-instalacao'],
  })
  await other.evaluate(() => window.releaseCausalEditor?.())
  expect(await recover(true)).toMatchObject({
    applied: false,
    failed: true,
    epoch: '1',
    opId: work.opId,
    prepared: 'minha-edicao',
    names: ['outra-instalacao'],
  })
  expect(await recover()).toEqual({
    applied: true,
    failed: false,
    epoch: '2',
    opId: undefined,
    prepared: undefined,
    names: ['da-conta-agora', 'minha-edicao-copia', 'outra-instalacao-copia', 'rascunho-copia'],
  })
})

test('gallery downloads the original gzip when a pre-v4 historical resource is missing', async ({
  page,
}) => {
  await proof(page)
  const work = await page.evaluate(() => window.pintaCausalRecovery.prepareRetainedRecovery())
  // A queue written before observed-resource retention has no historical sheet bytes.
  // Keep this fixture distinct from a V4 queue, which must recover the complete world.
  await page.evaluate(async ({ namespace }) => {
    const physical = window.pintaPhysicalRegions
    const db = physical.createStore(`sistema-zero-pinta-${namespace}`, 'kv')
    await physical.withAssetTransaction(
      db,
      (records) => {
        const current = records.get('pinta:sync:causal')
        if (!current || typeof current !== 'object' || !('pins' in current))
          throw Error('Fila de preparação ausente')
        const { pins: _pins, ...record } = current
        records.set('pinta:sync:causal', { ...record, version: 3 })
        records.delete('pinta:sync:observed-resources')
      },
      () => ['pinta:sync:causal', 'pinta:sync:observed-resources'],
    )
  }, work)
  await proof(page, 'pre-causal')
  await page.evaluate(async ({ namespace, sheetId }) => {
    const legacy = window.pinta026.createPintaPersistence({ namespace })
    const sheet = await legacy.loadAssetById(sheetId)
    if (sheet?.name !== 'pecas') throw Error('Folha base não apareceu no leitor anterior')
    await legacy.persistAsset({ ...sheet, name: 'pecas-do-aparelho' })
  }, work)

  await proof(page)
  const inspect = () =>
    page.evaluate(async ({ namespace, mapId, sheetId }) => {
      const local = window.pinta026.createPintaCausalPersistence({ namespace })
      const seal = await local.causal.inFlight()
      const candidate = seal?.blobs.get(mapId)
      return {
        catalogue: (await local.listAllAssets()).map(({ name }) => name).sort(),
        revisions: (await local.causal.capture([mapId, sheetId])).map(
          ({ beforeRevision }) => beforeRevision,
        ),
        epoch: (await local.causal.inspect()).epoch,
        opId: seal?.sealed.intent.opId,
        bytes: candidate && [...new Uint8Array(await candidate.arrayBuffer())],
      }
    }, work)
  const before = await inspect()
  expect(before).toMatchObject({
    catalogue: ['pecas-do-aparelho', 'vila-autoral'],
    epoch: '1',
    opId: work.opId,
  })
  await page.evaluate(
    (state) => window.pintaCausalRecovery.mountRetainedRecoveryGallery(state),
    work,
  )
  const action = page.getByRole('button', { name: 'Baixar arquivos para a equipe' })
  await expect(action).toBeVisible()
  const downloading = page.waitForEvent('download')
  await action.click()
  const download = await downloading
  expect(download.suggestedFilename()).toBe('edicoes-guardadas-pinta.zip')
  const zip = unzipSync(await readFile(await download.path()))
  const gzip = zip[`${work.opId}/${work.mapId}.pinta.json.gz`]!
  expect(createHash('sha256').update(gzip).digest('hex')).toBe(work.sha256)
  expect([...gzip]).toEqual(before.bytes)
  const decodedName = await page.evaluate(
    ({ namespace, json }) =>
      window.pinta026.createPintaCausalPersistence({ namespace }).causal.decodeCandidate(json)
        ?.name,
    { namespace: work.namespace, json: gunzipSync(gzip).toString() },
  )
  expect(decodedName).toBe('vila-autoral')
  expect(zip[`${work.opId}/revisoes-e-vinculos.json`]).toBeDefined()
  expect(await inspect()).toEqual(before)
})

test('gallery restores both complete worlds from V4 observed bytes after an old tab edits the sheet', async ({
  page,
}) => {
  await proof(page)
  const work = await page.evaluate(() => window.pintaCausalRecovery.prepareRetainedRecovery())
  await proof(page, 'pre-causal')
  await page.evaluate(async ({ namespace, sheetId }) => {
    const legacy = window.pinta026.createPintaPersistence({ namespace })
    const sheet = await legacy.loadAssetById(sheetId)
    if (sheet?.kind !== 'tileset') throw Error('Folha base ausente')
    sheet.tiles[0]!.data[0] = 5
    await legacy.persistAsset({ ...sheet, name: 'pecas-do-aparelho' })
  }, work)
  await proof(page)
  await page.evaluate(
    (state) => window.pintaCausalRecovery.mountRetainedRecoveryGallery(state),
    work,
  )
  await expect
    .poll(() =>
      page.evaluate(async ({ namespace, mapId }) => {
        const local = window.pinta026.createPintaCausalPersistence({ namespace })
        const state = await local.causal.inspect()
        if (state.epoch !== '2' || state.sealed || state.pending.length) return null
        const assets = await local.listAllAssets()
        const worlds = assets.filter((asset) => asset.kind === 'tilemap' && asset.id !== mapId)
        return worlds
          .map((map) => {
            if (map.kind !== 'tilemap') throw Error('Cópia de mapa inválida')
            const sheet = assets.find((asset) => asset.id === map.tilesetId)
            if (sheet?.kind !== 'tileset') throw Error('Peças da cópia ausentes')
            return sheet.tiles[0]?.data[0]
          })
          .sort()
      }, work),
    )
    .toEqual([0, 5])
  await expect(page.getByRole('button', { name: 'Baixar arquivos para a equipe' })).toHaveCount(0)
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

test('gallery offers the exact original download after reopening a v3 queue offline', async ({
  page,
  context,
}) => {
  await proof(page)
  const recorded = await page.evaluate(async () => {
    const p = window.pinta026
    const namespace = crypto.randomUUID()
    const local = p.createPintaCausalPersistence({ namespace })
    const sheet = p.createTilesetAsset({ name: 'folha', tileSize: 8 })
    const map = p.createTilemapAsset({ name: 'vila', tilesetId: sheet.id, cols: 2, rows: 2 })
    map.layers[0]!.cells![0] = 0
    const signal = new AbortController().signal
    const encoded = await local.causal.encodeCandidates([sheet, map], signal)
    await local.causal.applyPull(
      {
        fromEpoch: null,
        epoch: '1',
        transitions: [sheet, map].map((after, i) => ({
          id: after.id,
          before: null,
          beforeRevision: null,
          after,
          remote: {
            revision: 1,
            sha256: encoded.puts[i]!.sha256,
            layoutRevision: i === 0 ? '1' : null,
          },
        })),
      },
      () => true,
    )
    const [base] = await local.causal.capture([map.id])
    if (base?.before?.kind !== 'tilemap') throw Error('Vila ausente')
    const after = { ...base.before, name: 'minha-vila' }
    const shadow = await local.causal.encodeCandidates([after], signal)
    const opId = crypto.randomUUID()
    await local.causal.stage({
      opId,
      baseEpoch: '1',
      shadow,
      readSet: [
        {
          source: 'snapshot',
          consumerId: map.id,
          targetId: sheet.id,
          revision: 1,
          sha256: encoded.puts[0]!.sha256,
          layoutRevision: '1',
        },
      ],
      transitions: [{ ...base, after, baseRevision: 1, operation: { type: 'update' } }],
    })
    const physical = window.pintaPhysicalRegions
    const db = physical.createStore(`sistema-zero-pinta-${namespace}`, 'kv')
    await physical.withAssetTransaction(
      db,
      (records) => {
        const current = records.get('pinta:sync:causal')
        if (!current || typeof current !== 'object') throw Error('Fila ausente')
        records.set('pinta:sync:causal', { ...current, version: 3 })
      },
      () => ['pinta:sync:causal'],
    )
    const legacy = p.createPintaPersistence({ namespace })
    const leaf = await legacy.loadAssetById(sheet.id)
    if (leaf?.kind !== 'tileset') throw Error('Folha ausente')
    leaf.tiles[0]!.data[0] = 5
    await legacy.persistAsset(leaf)
    return { namespace, opId, mapId: map.id, sheetId: sheet.id, sha: shadow.puts[0]!.sha256 }
  })
  await page.close()
  const reopened = await context.newPage()
  await reopened.goto('/proof/recovery-gallery.html')
  await reopened.waitForFunction(() => typeof window.mountPintaRecoveryGallery === 'function')
  await context.setOffline(true)
  try {
    await reopened.evaluate(
      (namespace) => window.mountPintaRecoveryGallery(namespace),
      recorded.namespace,
    )
    const button = reopened.getByRole('button', { name: 'Baixar arquivos para a equipe' })
    await expect(button).toBeVisible()
    const download = reopened.waitForEvent('download')
    await button.click()
    const result = await download
    expect(result.suggestedFilename()).toBe('edicoes-guardadas-pinta.zip')
    const path = await result.path()
    if (!path) throw Error('Download ausente')
    const files = unzipSync(await readFile(path))
    expect(Object.keys(files).sort()).toEqual(
      [
        `${recorded.opId}/${recorded.mapId}.pinta.json.gz`,
        `${recorded.opId}/revisoes-e-vinculos.json`,
        'LEIA-ME.txt',
      ].sort(),
    )
    const gzip = files[`${recorded.opId}/${recorded.mapId}.pinta.json.gz`]
    if (!gzip) throw Error('Arquivo nativo ausente')
    expect(createHash('sha256').update(gzip).digest('hex')).toBe(recorded.sha)
    expect(JSON.parse(gunzipSync(gzip).toString('utf8')).assets[0]).toMatchObject({
      id: recorded.mapId,
      name: 'minha-vila',
      tilesetId: recorded.sheetId,
    })
  } finally {
    await reopened.close()
    await context.setOffline(false)
  }
})
