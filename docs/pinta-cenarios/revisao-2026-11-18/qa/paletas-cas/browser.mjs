import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { join } from 'node:path'

const [host, root] = process.argv.slice(2)
const { chromium } = createRequire(join(root, 'packages/molda-cenarios/package.json'))(
  'playwright-core',
)
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const context = await browser.newContext({ serviceWorkers: 'block' })
  await context.route('**/*', (route) =>
    new URL(route.request().url()).origin === host ? route.continue() : route.abort(),
  )
  async function page(version = 'atual') {
    const tab = await context.newPage()
    await tab.goto(host + '/' + version + '.html')
    await tab.waitForFunction(() => window.api?.createPintaPersistence)
    await tab.evaluate(() => {
      window.local = window.api.createPintaPersistence({ namespace: 'prova-paletas' })
      window.doc = (id, t) => ({
        version: 1,
        updatedAt: t,
        removed: [],
        palettes: [{ id, name: id, updatedAt: t, colors: ['', '#112233', ...Array(14).fill('')] }],
      })
    })
    return tab
  }
  const a = await page(),
    b = await page()
  for (const tab of [a, b])
    await tab.evaluate(() => {
      window.startRead = async (slow) => {
        const initial = window.doc('apagada', 2)
        const latest = {
          version: 1,
          updatedAt: 100,
          palettes: [],
          removed: Array.from({ length: 48 }, (_, i) => ({ id: 'recent-' + i, removedAt: 51 + i })),
        }
        let calls = 0
        const cloud = {
          tool: 'pinta',
          supported: true,
          enqueueUpload(_id, produce) {
            window.upload = produce
          },
          async download() {
            const old = slow && ++calls === 1
            if (old)
              await new Promise((resolve) => {
                window.resume = resolve
              })
            const data = old ? initial : latest
            return {
              json: JSON.stringify(data),
              summary: {
                itemId: 'sz-pinta-palettes',
                kind: 'palette-library',
                revision: old ? 2 : 52,
                itemUpdatedAt: data.updatedAt,
              },
            }
          },
        }
        window.mirror = window.api.createCloudMirroredPintaPersistence({
          local: window.local,
          viewerId: 'prova-paletas',
          cloud,
          marks: window.api.createMemorySyncedMarks(),
        })
        await window.mirror.syncPaletteLibrary()
      }
    })
  const pending = a.evaluate(() => window.startRead(true))
  await a.waitForFunction(() => typeof window.resume === 'function')
  await b.evaluate(() => window.startRead(false))
  await a.evaluate(() => window.resume())
  await pending
  assert.deepEqual(
    await a.evaluate(async () => ({
      count: (await window.local.loadPaletteLibrary()).palettes.length,
      revision: (await window.local.paletteAccount.inspect()).revision,
      upload: !!window.upload,
    })),
    { count: 0, revision: 52, upload: false },
  )
  await a.close()
  await b.close()
  const old = await page('antigo')
  await old.evaluate(() => window.local.savePaletteLibrary(window.doc('usuario-antigo', 200)))
  await old.close()
  const after = await page()
  const result = await after.evaluate(async () => {
    const saved = await window.local.loadPaletteLibrary()
    const proof = await window.local.paletteAccount.inspect()
    return {
      ids: saved.palettes.map((p) => p.id),
      names: saved.palettes.map((p) => p.name),
      dirty: proof.dirty,
      revision: proof.revision,
      wire: proof.candidate.palettes,
    }
  })
  assert.equal(result.ids.length, 1)
  assert.notEqual(result.ids[0], 'usuario-antigo')
  assert.deepEqual(result.names, ['usuario-antigo (cópia)'])
  assert.equal(result.dirty, false)
  assert.equal(result.revision, 52)
  assert.deepEqual(result.wire, [])
  await after.close()
  const retry = await page()
  assert.deepEqual(
    await retry.evaluate(async () =>
      (await window.local.loadPaletteLibrary()).palettes.map((p) => p.id),
    ),
    result.ids,
  )
  const submitting = await page()
  const preparation = await submitting.evaluate(async () => {
    const local = window.api.createPintaPersistence({ namespace: 'paleta-negociada' })
    const protocol = 'palette-cas-v1',
      head = { protocol, revision: 0, exists: false, adopted: false, generation: null }
    const a = local.paletteAccount,
      active = () => true
    await a.receive(await a.inspect(), null, active, 0, undefined, head)
    const first = window.doc('paleta', 10)
    await local.savePaletteLibrary(first)
    const seen = await a.inspect(),
      ticket = {
        protocol,
        nonce: crypto.randomUUID(),
        baseGeneration: null,
        expiresAt: new Date(200).toISOString(),
      }
    if (!(await a.prepare(seen, { ticket, revision: 1, sent: first }, active)))
      throw Error('A preparação não foi gravada.')
    const next = window.doc('paleta', 11)
    next.palettes[0].name = 'Gesto posterior'
    await local.savePaletteLibrary(next)
    return { nonce: ticket.nonce, first }
  })
  await submitting.close()
  const predecessor = await page('anterior')
  await assert.rejects(
    predecessor.evaluate(async () => {
      await window.api
        .createPintaPersistence({ namespace: 'paleta-negociada' })
        .savePaletteLibrary(window.doc('incompatível', 90))
    }),
    /versão mais nova/,
  )
  await predecessor.close()
  const resumed = await page()
  const recovered = await resumed.evaluate(async (nonce) => {
    const local = window.api.createPintaPersistence({ namespace: 'paleta-negociada' })
    const a = local.paletteAccount,
      seen = await a.inspect()
    const head = {
      protocol: 'palette-cas-v1',
      generation: crypto.randomUUID(),
      revision: 1,
      adopted: true,
      exists: true,
    }
    const ack = await a.acknowledge(seen, seen.submission.sent, 1, () => true, head, nonce)
    return {
      saved: seen.submission.sent,
      dirty: ack.dirty,
      pending: !!ack.submission,
      current: ack.candidate.palettes[0].name,
    }
  }, preparation.nonce)
  assert.deepEqual(recovered, {
    saved: preparation.first,
    dirty: true,
    pending: false,
    current: 'Gesto posterior',
  })
  const retained = await resumed.evaluate(async () => {
    const local = window.api.createPintaPersistence({ namespace: 'paleta-negociada' })
    const auth = local.paletteAccount
    for (let index = 0; index <= 48; index++) {
      const id = index === 0 ? 'paleta' : 'temporaria-' + index
      const removedAt = 100 + index
      await local.savePaletteLibrary({
        version: 1,
        updatedAt: removedAt,
        palettes: [],
        removed: [{ id, removedAt }],
      })
    }
    const result = await auth.inspect()
    return { marks: result.removals, file: result.candidate }
  })
  assert.deepEqual(retained.marks, [{ id: 'paleta', removedAt: 100 }])
  assert.equal(retained.file.removed.length, 48)
  const v2 = await page('negociado')
  await assert.rejects(
    v2.evaluate(async () =>
      window.api
        .createPintaPersistence({ namespace: 'paleta-negociada' })
        .savePaletteLibrary(window.doc('antiga', 200)),
    ),
    /versão mais nova/,
  )
  await v2.close()
  const reopened = await page()
  assert.deepEqual(
    await reopened.evaluate(async () => {
      const p = window.api.createPintaPersistence({ namespace: 'paleta-negociada' }).paletteAccount
      const seen = await p.inspect()
      return { marks: seen.removals, file: seen.candidate }
    }),
    retained,
  )
  await reopened.close()
  await resumed.close()
  console.log(
    JSON.stringify({
      chrome: browser.version(),
      disk3: {
        predecessor: '45024acaaa66ccf8c4dc56de0d0d92ecae119cd2',
        refusedWrite: true,
        removals: retained.marks.length,
      },
      disk2: {
        historicalWriter: '14fcee965333172f8d101e5445b165d4ace817b1',
        refusedWrite: true,
        replayed: true,
        retainedSuccessor: true,
      },
      historical: '64c197d5332a36b73af54de6ae5bf045a4a7699e',
      lateGet: { revision: 52, palettes: 0, uploads: 0 },
      legacyWrite: { recoveredCopies: 1, upload: false },
      reopen: 'same-copy',
    }),
  )
  await retry.close()
} finally {
  await browser.close()
}
