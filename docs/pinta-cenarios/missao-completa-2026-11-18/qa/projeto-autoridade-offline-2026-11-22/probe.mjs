import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const [studio, fixtureFile, oldFile, modernFile] = process.argv.slice(2)
const { chromium } = createRequire(resolve(studio, 'package.json'))('@playwright/test')
const old = readFileSync(oldFile),
  modern = readFileSync(modernFile),
  fixtureBytes = readFileSync(fixtureFile)
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const bundles = { old: sha(old), modern: sha(modern), fixture: sha(fixtureBytes) }
assert.deepEqual(bundles, {
  old: '6e54e7f26feb3924ea26a785ea375b20286be92216290dedfa5078f7a1c3f4e6',
  modern: '50b3a361f0dc71d920b6c74a35b42194f923d9cfda1e026319a0e8985badb0cb',
  fixture: 'cd944bcd979d6248ee675647d75205de04bdee30aafdedee26d22f3b96487e22',
})
const fixture = JSON.parse(fixtureBytes)
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const context = await browser.newContext({ serviceWorkers: 'block' }),
    origin = 'http://127.0.0.1:57802'
  await context.route('**/*', (route) => {
    const u = new URL(route.request().url())
    if (u.origin !== origin) return route.abort()
    if (u.pathname === '/old')
      return route.fulfill({ contentType: 'application/javascript', body: old })
    if (u.pathname === '/modern')
      return route.fulfill({ contentType: 'application/javascript', body: modern })
    if (u.pathname === '/')
      return route.fulfill({ contentType: 'text/html', body: '<!doctype html>' })
    return route.abort()
  })
  async function tab(revision) {
    const t = await context.newPage()
    await t.goto(origin)
    await t.evaluate(async (revision) => {
      window.api = await import('/' + revision)
    }, revision)
    return t
  }
  const a = await tab('old'),
    b = await tab('modern')
  await context.setOffline(true)
  const label = 'recovery-probe',
    namespace = 'pinta-regional-local:' + label
  await a.evaluate(
    async ({ namespace, previous }) => {
      const p = window.api
      p.setStorageNamespace(namespace)
      const s = p.getProjectStorageScope(namespace)
      window.originals = new Map()
      for (const id of ['autosave', 'restore', 'cleanup', 'delete', 'explicit']) {
        const project = p.createEmptyProject(id, 'Oficina ' + id)
        project.assets = [
          {
            id: 'material',
            name: 'vila',
            proPath: 'public/materials/vila.png',
            source: 'library',
            libId: 'personal:' + previous.id,
            libOrigin: 'pinta',
            kind: 'image',
            width: previous.width,
            height: previous.height,
            dataUrl: previous.dataUrl,
          },
        ]
        project.files['script.js'] = 'console.log("antes da troca")'
        project.blocksState = {
          blocks: {
            languageVersion: 0,
            blocks: [
              {
                type: 'sz_js_console_log_text',
                id: 'bloco-original',
                fields: { VALUE: 'antes da troca' },
              },
            ],
          },
        }
        await p.persistProject(project, {}, s)
        const opened = await p.prepareEditableStudioProject(await p.loadProjectById(id, s))
        window.originals.set(id, opened)
      }
    },
    { namespace, previous: fixture.previous },
  )
  await b.evaluate(
    async ({ label, source }) => {
      const p = window.api,
        s = p.privateRegionalProjectScope(label)
      p.setProjectStorageNamespace(s.namespace)
      const capture = {
        width: source.width,
        height: source.height,
        dataUrl: source.dataUrl,
        regional: { dataVersion: 5, sourceId: source.id, sha256: source.regional.sha256 },
      }
      for (const projectId of ['autosave', 'restore', 'cleanup', 'delete', 'explicit']) {
        const accepted = await p.refreshPrivateRegionalProjectAsset({
          projectId,
          assetId: 'material',
          scope: s,
          capture,
        })
        if (!accepted) throw Error('O controle regional não foi promovido.')
      }
    },
    { label, source: fixture.current },
  )
  await b.evaluate(async () => window.api.useProjectStore.getState().deleteProject('explicit'))
  const controls = await a.evaluate(async (namespace) => {
    const p = window.api,
      s = p.getProjectStorageScope(namespace)
    const write = window.originals.get('autosave')
    write.files['script.js'] = 'console.log("edição da aba antiga")'
    let autosaveRejected = false
    try {
      await p.persistProject(write, {}, s)
    } catch {
      autosaveRejected = true
    }
    const restored = structuredClone(window.originals.get('restore'))
    restored.files['script.js'] = 'console.log("restauro pelo leitor antigo")'
    restored.blocksState.blocks.blocks[0].id = 'bloco-do-restauro'
    await p.restoreProjectFromCloud(restored, { expectedId: 'restore', namespace })
    const prior = await p.loadProjectById('restore', s)
    const cleanupKey = 'sz:v4:project-backup:cleanup:' + 'a'.repeat(64)
    await s.store('readwrite', (store) => {
      store.put({ test: 'resíduo de backup' }, cleanupKey)
    })
    await p.discardImportedProjectSnapshot('cleanup', { namespace })
    await p.discardImportedProjectSnapshot('delete', { namespace })
    const cleanupGone = await s.store(
      'readonly',
      (store) =>
        new Promise((res, rej) => {
          const r = store.get(cleanupKey)
          r.onsuccess = () => res(r.result === undefined)
          r.onerror = () => rej(r.error)
        }),
    )
    return {
      autosaveRejected,
      oldRestoreObserved:
        prior.files['script.js'] === restored.files['script.js'] &&
        prior.blocksState.blocks.blocks[0].id === 'bloco-do-restauro',
      cleanupGone,
    }
  }, namespace)
  assert.deepEqual(controls, {
    autosaveRejected: true,
    oldRestoreObserved: true,
    cleanupGone: true,
  })
  // The page reload itself uses the loopback fixture shell; project recovery runs offline again.
  await b.close()
  await context.setOffline(false)
  const reopened = await tab('modern')
  await context.setOffline(true)
  const outcome = await reopened.evaluate(
    async ({ label, source, previous }) => {
      const p = window.api,
        s = p.privateRegionalProjectScope(label)
      const ids = []
      for (const id of ['autosave', 'restore', 'cleanup', 'delete', 'explicit']) {
        const project = await p.loadProjectById(id, s)
        const asset = project?.assets?.[0]
        ids.push({
          id,
          exists: !!project,
          bytes:
            asset?.dataUrl === source.dataUrl
              ? 'png5'
              : asset?.dataUrl === previous.dataUrl
                ? 'png4'
                : null,
          script: project?.files?.['script.js'] ?? null,
          block: project?.blocksState?.blocks?.blocks?.[0]?.id ?? null,
        })
      }
      return ids
    },
    { label, source: fixture.current, previous: fixture.previous },
  )
  assert.deepEqual(outcome, [
    {
      id: 'autosave',
      exists: true,
      bytes: 'png5',
      script: 'console.log("antes da troca")',
      block: 'bloco-original',
    },
    {
      id: 'restore',
      exists: true,
      bytes: 'png4',
      script: 'console.log("restauro pelo leitor antigo")',
      block: 'bloco-do-restauro',
    },
    { id: 'cleanup', exists: false, bytes: null, script: null, block: null },
    { id: 'delete', exists: false, bytes: null, script: null, block: null },
    { id: 'explicit', exists: false, bytes: null, script: null, block: null },
  ])
  console.log(JSON.stringify({ browser: browser.version(), bundles, controls, outcome }, null, 2))
} finally {
  await browser.close()
}
