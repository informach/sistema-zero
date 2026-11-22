import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'

const [host, root] = process.argv.slice(2)
const { chromium } = createRequire(join(root, 'packages/molda-cenarios/package.json'))(
  'playwright-core',
)
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--enable-automation'],
})
try {
  const cdp = await browser.newBrowserCDPSession()
  const { arguments: chromeArguments } = await cdp.send('Browser.getBrowserCommandLine')
  const chromeHash = createHash('sha256')
  for await (const chunk of createReadStream(chromeArguments[0])) chromeHash.update(chunk)
  await cdp.detach()
  const context = await browser.newContext({ serviceWorkers: 'block' })
  await context.route('**/*', (route) =>
    new URL(route.request().url()).origin === host ? route.continue() : route.abort(),
  )
  const seed = async () => {
    const page = await open('new')
    const seed = await page.evaluate(async () => {
      const p = window.proof
      const namespace = crypto.randomUUID()
      const local = p.createPintaCausalPersistence({ namespace })
      const sheet = p.createTilesetAsset({ name: 'folha', tileSize: 16 })
      const map = {
        ...p.createTilemapAsset({ name: 'mapa-sete', tilesetId: sheet.id, cols: 2, rows: 1 }),
        physics: 'precise',
      }
      await local.persistAssets([sheet, map])
      assertOk(
        await local.causal.applyPull({ fromEpoch: null, epoch: '1', transitions: [] }, () => true),
        'initial pull',
      )
      const [base] = await local.causal.capture([map.id])
      const after = { ...base.before, name: 'movimento-causal' }
      const opId = crypto.randomUUID()
      const readSet = [
        {
          source: 'snapshot',
          consumerId: map.id,
          targetId: sheet.id,
          revision: 1,
          sha256: 'a'.repeat(64),
          layoutRevision: '1',
        },
      ]
      const pending = await local.causal.stage({
        opId,
        baseEpoch: '1',
        readSet,
        independent: true,
        transitions: [{ ...base, after, baseRevision: 1, operation: { type: 'update' } }],
      })
      const gzip = await new Response(
        new Blob([p.assetToJson(after)]).stream().pipeThrough(new CompressionStream('gzip')),
      ).blob()
      const sha256 = Array.from(
        new Uint8Array(await crypto.subtle.digest('SHA-256', await gzip.arrayBuffer())),
        (byte) => byte.toString(16).padStart(2, '0'),
      ).join('')
      const put = {
        itemId: map.id,
        bytes: gzip.size,
        sha256,
        kind: map.kind,
        name: after.name,
        itemUpdatedAt: new Date(after.updatedAt).toISOString(),
        formatVersion: 6,
      }
      assertOk(
        await local.causal.freeze(opId, pending.preparation, [put], new Map([[map.id, gzip]])),
        'expected a prepared operation',
      )
      assertOk((await local.causal.inspect()).prepared?.size === 1, 'expected 1 prepared operation')
      assertOk(p.pintaAssetSchema(after) === 7, 'fixture must be native 7')
      return { namespace, itemId: map.id, sheetId: sheet.id, opId, put, readSet }
      function assertOk(ok, reason) {
        if (!ok) throw Error(reason)
      }
    })
    await page.close()
    return seed
  }
  async function open(version) {
    const page = await context.newPage()
    await page.goto(`${host}/${version}.html`)
    await page.waitForFunction(() => Boolean(window.proof))
    return page
  }
  const mismatch = await seed()
  const old = await open('old')
  const beforeLoss = await old.evaluate(async ({ namespace, opId }) => {
    const local = window.proof.createPintaCausalPersistence({ namespace })
    const before = await local.causal.inspect()
    const wrote = await local.causal.applyPull(
      { fromEpoch: '1', epoch: '2', transitions: [] },
      () => true,
    )
    return {
      readEpoch: before.epoch,
      matched: before.pending[0]?.opId === opId,
      preparedSeen: before.prepared?.size ?? 0,
      wrote,
    }
  }, mismatch)
  await old.close()
  const fresh = await open('new')
  const afterLoss = await fresh.evaluate(async ({ namespace, itemId, opId }) => {
    const local = window.proof.createPintaCausalPersistence({ namespace })
    const state = await local.causal.inspect()
    const candidate = await local.causal.prepared(opId)
    const raw = await new Promise((resolve, reject) => {
      const opening = indexedDB.open(`sistema-zero-pinta-${namespace}`)
      opening.onerror = () => reject(opening.error)
      opening.onsuccess = () => {
        const db = opening.result
        const get = db.transaction('kv').objectStore('kv').get(`pinta:sync:prepared:${opId}`)
        get.onerror = () => {
          db.close()
          reject(get.error)
        }
        get.onsuccess = () => {
          db.close()
          resolve(get.result)
        }
      }
    })
    return {
      epoch: state.epoch,
      pending: state.pending.length,
      prepared: !!candidate,
      orphanBytes: raw?.get(itemId)?.size ?? 0,
    }
  }, mismatch)
  await fresh.close()
  assert.deepEqual(beforeLoss, { readEpoch: '1', matched: true, preparedSeen: 0, wrote: true })
  assert.deepEqual(afterLoss, {
    epoch: '2',
    pending: 1,
    prepared: false,
    orphanBytes: mismatch.put.bytes,
  })

  const legacySeed = await seed()
  const publicPage = await open('public')
  const publicWrite = await publicPage.evaluate(async ({ namespace, itemId }) => {
    const p = window.proof
    const local = p.createPintaPersistence({ namespace })
    const assets = await local.listAllAssets()
    const map = assets.find((item) => item.id === itemId)
    if (!map) throw Error('legacy reader did not read the native 7 document')
    const before = p.pintaAssetSchema(map)
    map.name = 'escrito-por-binario-publico'
    map.layers[0].cells[0] = 0
    await local.persistAsset(map)
    const after = (await local.listAllAssets()).find((item) => item.id === itemId)
    return {
      maxSchema: p.PINTA_MAX_SCHEMA,
      before,
      after: p.pintaAssetSchema(after),
      name: after.name,
      cell: after.layers[0].cells[0],
      noCausal: !p.createPintaCausalPersistence,
    }
  }, legacySeed)
  await publicPage.close()
  const back = await open('new')
  const afterLegacy = await back.evaluate(async ({ namespace, itemId, opId, put, readSet }) => {
    const local = window.proof.createPintaCausalPersistence({ namespace })
    const pending = (await local.causal.inspect()).pending[0]
    const frozen = await local.causal.prepared(opId)
    if (!frozen) throw Error('legacy writer destroyed the prepared blob')
    const [latest] = await local.causal.capture([itemId])
    const actual = Array.from(
      new Uint8Array(
        await crypto.subtle.digest('SHA-256', await frozen.blobs.get(itemId).arrayBuffer()),
      ),
      (byte) => byte.toString(16).padStart(2, '0'),
    ).join('')
    const intent = {
      protocol: 1,
      opId,
      baseEpoch: '1',
      reader: 6,
      readSet,
      members: [{ ...put, action: 'put', operation: { type: 'update' }, baseRevision: 1 }],
    }
    const intentHash = 'b'.repeat(64)
    const sealed = await local.causal.seal(pending.preparation, intent, intentHash, frozen.blobs)
    const announced = await local.causal.acknowledge({
      opId,
      epoch: '2',
      intentHash,
      members: [{ itemId, revision: 2, deleted: false, sha256: put.sha256, layoutRevision: null }],
    })
    const state = await local.causal.inspect()
    const [after] = await local.causal.capture([itemId])
    let deferred = false
    try {
      const replaced = { ...after.before, name: 'mudanca-remota-posterior' }
      const installed = await local.causal.applyPull(
        {
          fromEpoch: '1',
          epoch: '3',
          transitions: [
            {
              ...after,
              after: replaced,
              remote: { revision: 3, sha256: '3'.repeat(64), layoutRevision: null },
            },
          ],
        },
        () => true,
      )
      deferred = !installed
    } catch {
      deferred = true
    }
    const [retained] = await local.causal.capture([itemId])
    return {
      newestName: latest.before.name,
      newestCell: latest.before.layers[0].cells[0],
      preparedShaUnchanged: actual === put.sha256,
      sealed,
      announced,
      pending: state.pending.length,
      dirty: state.confirmed.get(itemId).localRevision !== after.beforeRevision,
      storedName: after.before.name,
      deferred,
      retainedName: retained.before.name,
      recoveryCopies: state.recovered?.size ?? 0,
    }
  }, legacySeed)
  assert.deepEqual(publicWrite, {
    maxSchema: 7,
    before: 7,
    after: 7,
    name: 'escrito-por-binario-publico',
    cell: 0,
    noCausal: true,
  })
  assert.deepEqual(afterLegacy, {
    newestName: 'escrito-por-binario-publico',
    newestCell: 0,
    preparedShaUnchanged: true,
    sealed: true,
    announced: true,
    pending: 0,
    dirty: true,
    storedName: 'escrito-por-binario-publico',
    deferred: true,
    retainedName: 'escrito-por-binario-publico',
    recoveryCopies: 0,
  })
  const beforeInitial = await open('new')
  const authored = await beforeInitial.evaluate(async () => {
    const p = window.proof
    const namespace = crypto.randomUUID()
    const local = p.createPintaCausalPersistence({ namespace })
    const sprite = p.createPixelSpriteAsset({ name: 'antes-da-nuvem', frameSize: 8 })
    const [base] = await local.causal.capture([sprite.id])
    await local.causal.stageUnbased({ transitions: [{ ...base, after: sprite }], readSet: [] })
    const pending = await local.causal.inspect()
    if (pending.unbased?.members.length !== 1) throw Error('unbased mount')
    return { namespace, itemId: sprite.id }
  })
  await beforeInitial.close()
  const olderInitial = await open('before-unbased')
  const oldInitialWrite = await olderInitial.evaluate(async ({ namespace }) => {
    const local = window.proof.createPintaCausalPersistence({ namespace })
    return local.causal.applyPull({ fromEpoch: null, epoch: '1', transitions: [] }, () => true)
  }, authored)
  await olderInitial.close()
  const latestInitial = await open('new')
  const afterInitial = await latestInitial.evaluate(async ({ namespace, itemId }) => {
    const local = window.proof.createPintaCausalPersistence({ namespace })
    const state = await local.causal.inspect()
    const [asset] = await local.causal.capture([itemId])
    return {
      epoch: state.epoch,
      unbased: state.unbased?.members.length ?? 0,
      pending: state.pending.length,
      name: asset.before.name,
    }
  }, authored)
  await latestInitial.close()
  assert.equal(oldInitialWrite, true)
  assert.deepEqual(afterInitial, { epoch: '1', unbased: 0, pending: 0, name: 'antes-da-nuvem' })

  const beforeRecovery = await open('new')
  const recovered = await beforeRecovery.evaluate(async () => {
    const p = window.proof
    const namespace = crypto.randomUUID()
    const local = p.createPintaCausalPersistence({ namespace })
    const sprite = p.createTilesetAsset({ name: 'local-antes-da-conta', tileSize: 16 })
    sprite.tiles[0].data[0] = 1
    await local.persistAsset(sprite)
    const [base] = await local.causal.capture([sprite.id])
    const after = structuredClone(base.before)
    after.name = 'versao-da-conta'
    after.tiles[0].data[0] = 2
    const active = await local.causal.applyPull(
      {
        fromEpoch: null,
        epoch: '1',
        recoverInitial: true,
        transitions: [
          { ...base, after, remote: { revision: 1, sha256: 'a'.repeat(64), layoutRevision: null } },
        ],
      },
      () => true,
    )
    if (!active) throw Error('recovery pull')
    const state = await local.causal.inspect()
    const copyId = [...(state.recovered?.keys() ?? [])][0]
    if (!copyId) throw Error('recovery mark expected')
    return { namespace, copyId }
  })
  await beforeRecovery.close()
  const olderRecovery = await open('before-recovered')
  const oldRecoveryWrite = await olderRecovery.evaluate(async ({ namespace }) => {
    const local = window.proof.createPintaCausalPersistence({ namespace })
    return local.causal.applyPull({ fromEpoch: '1', epoch: '2', transitions: [] }, () => true)
  }, recovered)
  await olderRecovery.close()
  const latestRecovery = await open('new')
  const afterRecovery = await latestRecovery.evaluate(async ({ namespace, copyId }) => {
    const local = window.proof.createPintaCausalPersistence({ namespace })
    const state = await local.causal.inspect()
    const [asset] = await local.causal.capture([copyId])
    return {
      epoch: state.epoch,
      recovered: state.recovered?.size ?? 0,
      copyPreserved: asset.before?.tiles[0]?.data[0] === 1,
    }
  }, recovered)
  assert.equal(oldRecoveryWrite, true)
  assert.deepEqual(afterRecovery, { epoch: '2', recovered: 0, copyPreserved: true })
  const oldState = await seed()
  const upgrade = await open('fenced')
  const migrate = await upgrade.evaluate(async ({ namespace, itemId, opId, put }) => {
    const local = window.proof.createPintaCausalPersistence({ namespace })
    const before = await local.causal.inspect()
    const changed = await local.causal.applyPull(
      { fromEpoch: '1', epoch: '2', transitions: [] },
      () => true,
    )
    const after = await local.causal.inspect()
    const prepared = await local.causal.prepared(opId)
    const data = await prepared?.blobs.get(itemId)?.arrayBuffer()
    const sha =
      data &&
      Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', data)), (byte) =>
        byte.toString(16).padStart(2, '0'),
      ).join('')
    return {
      beforeVersion: before.version,
      afterVersion: after.version,
      changed,
      shaUnchanged: sha === put.sha256,
    }
  }, oldState)
  await upgrade.close()
  const blocked = await open('old')
  const refusal = await blocked.evaluate(async ({ namespace }) => {
    const local = window.proof.createPintaCausalPersistence({ namespace })
    const rejected = (promise) =>
      promise.then(
        () => false,
        () => true,
      )
    return {
      inspectionRejected: await rejected(local.causal.inspect()),
      writeRejected: await rejected(
        local.causal.applyPull({ fromEpoch: '2', epoch: '3', transitions: [] }, () => true),
      ),
    }
  }, oldState)
  await blocked.close()
  const inspect = await open('fenced')
  const final = await inspect.evaluate(async ({ namespace, itemId, opId, put }) => {
    const local = window.proof.createPintaCausalPersistence({ namespace })
    const state = await local.causal.inspect()
    const frozen = await local.causal.prepared(opId)
    const data = await frozen?.blobs.get(itemId)?.arrayBuffer()
    const sha =
      data &&
      Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', data)), (byte) =>
        byte.toString(16).padStart(2, '0'),
      ).join('')
    return {
      version: state.version,
      epoch: state.epoch,
      firstOpUnchanged: state.pending[0]?.opId === opId,
      shaUnchanged: sha === put.sha256,
    }
  }, oldState)
  assert.deepEqual(migrate, {
    beforeVersion: 1,
    afterVersion: 2,
    changed: true,
    shaUnchanged: true,
  })
  assert.deepEqual(refusal, { inspectionRejected: true, writeRejected: true })
  assert.deepEqual(final, { version: 2, epoch: '2', firstOpUnchanged: true, shaUnchanged: true })
  console.log(
    JSON.stringify(
      {
        browser: browser.version(),
        chromeExecutableSha256: chromeHash.digest('hex'),
        causalDowngrade: { beforeLoss, afterLoss },
        publicLegacy: { publicWrite, afterLegacy },
        unbasedDowngrade: { oldInitialWrite, afterInitial },
        recoveredDowngrade: { oldRecoveryWrite, afterRecovery },
        fencedCompatibility: { migrate, refusal, final },
      },
      null,
      2,
    ),
  )
  await context.close()
} finally {
  await browser.close()
}
