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
  console.log(
    JSON.stringify({
      chrome: browser.version(),
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
