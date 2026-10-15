import { afterEach, expect, test } from 'bun:test'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ProjectAsset } from '#core'
import { buildProAssetBundle } from '../../core/proAssets'
import { createProAssetSync } from './proAssetSync'

const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})
const drawing = (color: string): ProjectAsset => ({
  id: 'drawing',
  name: 'heroi',
  kind: 'image',
  source: 'upload',
  dataUrl: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg"><rect fill="${color}" width="16" height="16"/></svg>`)}`,
})
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'studio-assets-'))
  roots.push(root)
  let assets = [drawing('red')]
  let active = true
  let writes = 0
  let failPath: string | null = null
  const messages: string[] = []
  const fs = {
    readFile: (path: string) => readFile(join(root, path)),
    writeFile: async (path: string, value: string | Uint8Array) => {
      if (path === failPath) {
        failPath = null
        throw new Error('filesystem unavailable')
      }
      writes++
      await writeFile(join(root, path), value)
    },
    mkdir: (path: string, options: { recursive: true }) => mkdir(join(root, path), options),
    rm: (path: string, options: { force: true }) => rm(join(root, path), options),
  }
  const sync = createProAssetSync(fs, {
    active: () => active,
    get: () => ({ assets, tree: {} }),
    apply(expected, next) {
      expect(assets).toBe(expected)
      assets = next
    },
    report: (message) => messages.push(message),
  })
  await sync.sync()
  const path = (await buildProAssetBundle(assets)).manifest.assets[0]!.path
  return {
    root,
    path,
    sync,
    messages,
    get assets() {
      return assets
    },
    set assets(next) {
      assets = next
    },
    get writes() {
      return writes
    },
    cancel() {
      active = false
    },
    failOnce(path: string) {
      failPath = path
    },
  }
}

test('mounts real bytes and no assets are rewritten by code edits', async () => {
  const f = await fixture()
  expect(await readFile(join(f.root, f.path), 'utf-8')).toContain('red')
  const count = f.writes
  await f.sync.sync(new Set(['']))
  await f.sync.sync(new Set(['src/main.ts']))
  expect(f.writes).toBe(count)
  f.assets = [drawing('blue')]
  await f.sync.sync(new Set(['']))
  expect(await readFile(join(f.root, f.path), 'utf-8')).toContain('blue')
})

test('new terminal image files are retained in the durable library at their original public path', async () => {
  const f = await fixture()
  const path = 'public/terminal.png'
  const bytes = Uint8Array.from(
    atob(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9WQAAAAASUVORK5CYII=',
    ),
    (character) => character.charCodeAt(0),
  )
  await writeFile(join(f.root, path), bytes)
  expect(await f.sync.ingest([path, 'src/unsupported.bin'])).toEqual(['src/unsupported.bin'])
  expect(f.assets).toHaveLength(2)
  expect(f.assets[1]!.proPath).toBe(path)
  await f.sync.sync()
  const restored = JSON.parse(JSON.stringify(f.assets)) as ProjectAsset[]
  const bundle = await buildProAssetBundle(restored)
  expect(bundle.files.get(path)).toEqual(bytes)
  expect(f.sync.owns(path)).toBe(true)
  expect(await f.sync.ingest([path])).toEqual([])
  expect(f.assets).toHaveLength(2)
})

test('a retry after a partial write preserves one terminal conflict copy without duplicating it', async () => {
  const f = await fixture()
  f.assets = [drawing('blue')]
  await writeFile(join(f.root, f.path), decodeURIComponent(drawing('green').dataUrl.split(',')[1]!))
  f.failOnce('public/studio-assets/manifest.json')
  await expect(f.sync.sync()).rejects.toThrow('filesystem unavailable')
  expect(f.assets).toHaveLength(2)
  const copyId = f.assets[1]!.id
  await f.sync.sync()
  expect(f.assets).toHaveLength(2)
  expect(f.assets[1]!.id).toBe(copyId)
  expect(await readFile(join(f.root, f.path), 'utf-8')).toContain('blue')
  expect(f.sync.owns('public/studio-assets/untracked.png')).toBe(false)
})

test('shell edits become durable assets; conflicting edits preserve both versions', async () => {
  const f = await fixture()
  const green = decodeURIComponent(drawing('green').dataUrl.split(',')[1]!)
  await writeFile(join(f.root, f.path), green)
  await f.sync.sync(new Set([f.path]))
  expect(Buffer.from(f.assets[0]!.dataUrl.split(',')[1]!, 'base64').toString()).toContain('green')
  await writeFile(join(f.root, f.path), green.replace('green', 'yellow'))
  f.assets = [drawing('blue')]
  await f.sync.sync(new Set([f.path]))
  expect(f.assets).toHaveLength(2)
  expect(f.assets[1]!.name).toContain('terminal')
  expect(await readFile(join(f.root, f.path), 'utf-8')).toContain('blue')
  expect(f.messages.some((message) => message.includes('simultâneas'))).toBe(true)
})

test('deleting a projection restores it; deleting through Materials removes only owned files', async () => {
  const f = await fixture()
  await rm(join(f.root, f.path))
  await f.sync.sync()
  expect(f.assets).toHaveLength(1)
  expect(await readFile(join(f.root, f.path), 'utf-8')).toContain('red')
  await writeFile(join(f.root, 'public/keep.png'), 'mine')
  f.assets = []
  await f.sync.sync(new Set(['']))
  await expect(readFile(join(f.root, f.path))).rejects.toBeDefined()
  expect(await readFile(join(f.root, 'public/keep.png'), 'utf-8')).toBe('mine')
})

test('cancellation prevents writes and no preexisting file is overwritten', async () => {
  const f = await fixture()
  const other = { ...drawing('blue'), id: 'other', name: 'other', proPath: 'public/mine.svg' }
  await writeFile(join(f.root, other.proPath), 'keep this')
  f.assets = [other]
  await expect(f.sync.sync()).rejects.toThrow('já existe')
  expect(await readFile(join(f.root, other.proPath), 'utf-8')).toBe('keep this')
  f.cancel()
  await expect(f.sync.sync()).rejects.toMatchObject({ name: 'AbortError' })
})
