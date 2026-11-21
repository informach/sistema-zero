import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, type Page, test } from '@playwright/test'

type ClipboardModule = Pick<
  typeof import('../../pinta/src/state/clipboardStore'),
  'createClipboardStore' | 'parseClipboardMirror'
>
declare global {
  interface Window {
    pintaClipboardQa: {
      current: ClipboardModule
      legacy: ClipboardModule
      store?: ReturnType<ClipboardModule['createClipboardStore']>
    }
  }
}
const root = resolve(import.meta.dirname, '../../..')
let bundles: Array<{ name: string; file: string; sha256: string }>
test.beforeAll(() => {
  bundles = JSON.parse(
    execFileSync(
      'bun',
      ['--no-env-file', resolve(root, 'packages/pinta/scripts/homologacao/clipboardRegions.ts')],
      { cwd: root, encoding: 'utf8' },
    ),
  ).bundles
})

test('clipboard de regiões: armazenamento real entre abas, versão antiga recusa e legado conserva os bytes', async ({
  page,
  context,
}, info) => {
  const namespace = `qa-clipboard-regions-${info.project.name}-${Date.now()}`,
    key = `pinta:clipboard:${encodeURIComponent(namespace)}`
  const cdp = await context.newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', {
    rate: Number(info.project.metadata.cpuSlowdown ?? 1),
  })
  await context.route('**/__pinta_clipboard_qa/**', async (route) => {
    const name = new URL(route.request().url()).pathname.split('/').at(-1)
    if (name === 'index.html')
      return route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><meta charset="utf-8"><title>Clipboard QA</title>',
      })
    const bundle = bundles.find((b) => name === `${b.name}.js`)
    if (!bundle) return route.abort()
    return route.fulfill({ contentType: 'text/javascript', body: await readFile(bundle.file) })
  })
  async function load(target: Page) {
    await target.goto('/__pinta_clipboard_qa/index.html')
    await target.addScriptTag({
      type: 'module',
      content:
        "import * as current from './current.js';import * as legacy from './legacy.js';window.pintaClipboardQa={current,legacy};",
    })
    await target.waitForFunction(() => !!window.pintaClipboardQa)
  }
  await load(page)
  const legacy = await page.evaluate(
    ({ namespace, key }) => {
      const q = window.pintaClipboardQa,
        item = {
          kind: 'objects' as const,
          objects: [
            {
              id: 'legacy',
              name: 'Árvore',
              type: '',
              x: 16,
              y: 32,
              width: 16,
              height: 16,
              properties: {},
              art: { assetId: 'tree', animationId: 'walk' },
            },
          ],
        }
      q.store = q.current.createClipboardStore({ namespace, now: () => 1 })
      q.store.getState().set(item)
      const current = localStorage.getItem(key)
      q.legacy
        .createClipboardStore({ namespace, now: () => 1 })
        .getState()
        .set(item)
      return { current, old: localStorage.getItem(key) }
    },
    { namespace, key },
  )
  expect(legacy.current).toBe(legacy.old)
  expect(JSON.parse(legacy.current!).v).toBe(2)
  const other = await context.newPage()
  await load(other)
  const signed = await other.evaluate(
    ({ namespace, key }) => {
      const store = window.pintaClipboardQa.current.createClipboardStore({
        namespace,
        now: () => 2,
      })
      const object = {
        id: 'signed',
        name: 'Árvore',
        type: '',
        x: -12.5,
        y: -4.25,
        width: 16.5,
        height: 24.75,
        rotation: 0,
        properties: {},
      }
      store.getState().set({ kind: 'objects', coordinates: 'signed', objects: [object] })
      return { object, raw: localStorage.getItem(key) }
    },
    { namespace, key },
  )
  expect(JSON.parse(signed.raw!).v).toBe(3)
  const restored = await page.evaluate(
    (key) => ({
      item: window.pintaClipboardQa.store!.getState().get(),
      old: window.pintaClipboardQa.legacy.parseClipboardMirror(localStorage.getItem(key)),
      raw: localStorage.getItem(key),
    }),
    key,
  )
  expect(restored.item).toEqual({
    kind: 'objects',
    coordinates: 'signed',
    objects: [signed.object],
  })
  expect(restored.old).toBeNull()
  expect(restored.raw).toBe(signed.raw)
  await other.close()
  const fresh = await context.newPage()
  await load(fresh)
  expect(
    await fresh.evaluate(
      (namespace) =>
        window.pintaClipboardQa.current.createClipboardStore({ namespace }).getState().get(),
      namespace,
    ),
  ).toEqual(restored.item)
  const corrupt = await fresh.evaluate(
    ({ namespace, key }) => {
      const raw = JSON.parse(localStorage.getItem(key)!)
      raw.objects.push({ ...raw.objects[0], id: 'invalid', x: 480001 })
      const text = JSON.stringify(raw)
      localStorage.setItem(key, text)
      const item = window.pintaClipboardQa.current
        .createClipboardStore({ namespace })
        .getState()
        .get()
      return { item, retained: localStorage.getItem(key) === text }
    },
    { namespace, key },
  )
  expect(corrupt).toEqual({ item: null, retained: true })
  await fresh.evaluate((key) => localStorage.removeItem(key), key)
  await fresh.close()
  await cdp.detach()
  await info.attach('clipboard-module-identities', {
    body: JSON.stringify(bundles.map(({ name, sha256 }) => ({ name, sha256 }))),
    contentType: 'application/json',
  })
})
