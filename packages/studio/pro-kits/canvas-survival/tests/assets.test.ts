import { afterAll, beforeAll, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { fileURLToPath } from 'node:url'
import { buildProAssetBundle } from '../../../src/core/proAssets'
import type { ProjectAsset } from '../../../src/core/project'
import {
  ASSET_LIMITS,
  characterBody,
  type LoadedCharacter,
  parseArenaManifest,
  pngDimensions,
  validateCharacter,
} from '../src/assets'
import { characters } from '../src/characters'
import type { ArenaEvent } from '../src/model'
import { advanceAnimation, frameRect } from '../src/render/animation'
import { createEffects, MAX_EFFECTS } from '../src/render/particles'

const pack = (await Bun.file(new URL('../assets/manifest.json', import.meta.url)).json()) as {
  assets: Array<{
    id: string
    role: 'player' | 'seeker' | 'drifter'
    file: string
    width: number
    height: number
    sha256: string
    sprite: NonNullable<ProjectAsset['sprite']>
  }>
}
const pngs = await Promise.all(
  pack.assets.map((asset) => readFile(new URL('../assets/' + asset.file, import.meta.url))),
)
function projectAssets(): ProjectAsset[] {
  return pack.assets.map((asset, index) => ({
    id: asset.id,
    name: asset.role,
    kind: 'image',
    source: 'upload',
    width: asset.width,
    height: asset.height,
    dataUrl: 'data:image/png;base64,' + pngs[index]!.toString('base64'),
    sprite: structuredClone(asset.sprite),
  }))
}
const canonical = await buildProAssetBundle(projectAssets())
let served = new Map(canonical.files)
let server: Server
let base: string

beforeAll(async () => {
  const entries = ['assets.ts', 'model.ts', 'render/canvas.ts'].map((name) =>
    fileURLToPath(new URL('../src/' + name, import.meta.url)),
  )
  const build = await Bun.build({
    entrypoints: entries,
    target: 'browser',
    format: 'esm',
    splitting: false,
    write: false,
  })
  if (!build.success) throw new Error(build.logs.map((log) => log.message).join('\n'))
  const modules = new Map(
    await Promise.all(
      build.outputs.map(
        async (output) => [output.path.split(/[\\/]/).pop()!, await output.text()] as const,
      ),
    ),
  )
  const changed = projectAssets()
  changed[0]!.dataUrl = changed[1]!.dataUrl
  const changedBytes = new Map((await buildProAssetBundle(changed)).files)
  changed[0]!.sprite!.animations[0]!.fps = 5
  const changedMeta = new Map((await buildProAssetBundle(changed)).files)
  const mismatch = new Map(canonical.files)
  mismatch.set(canonical.manifest.assets[0]!.path, pngs[1]!)
  const scenarios = {
    original: new Map(canonical.files),
    bytes: changedBytes,
    metadata: changedMeta,
    mismatch,
  }
  // node:http is independent of the HappyDOM Response installed by Studio's preload.
  server = createServer((request, response) => {
    const url = new URL(request.url!, 'http://127.0.0.1')
    if (url.pathname.endsWith('/__fixture')) {
      const name = url.searchParams.get('scenario') as keyof typeof scenarios
      if (!scenarios[name]) {
        response.writeHead(400)
        response.end('invalid')
        return
      }
      served = scenarios[name]
      response.end('ready')
      return
    }
    const path = url.pathname.replace('/nested/game/', '')
    if (!path) {
      response.writeHead(200, { 'content-type': 'text/html' })
      response.end(
        '<!doctype html><html><body><div id="stage" style="width:360px;height:270px"></div></body></html>',
      )
      return
    }
    if (modules.has(path)) {
      response.writeHead(200, { 'content-type': 'application/javascript' })
      response.end(modules.get(path))
      return
    }
    const bytes = served.get('public/' + path)
    if (bytes) {
      response.writeHead(200, {
        'content-type': path.endsWith('.json') ? 'application/json' : 'image/png',
        'cache-control': 'public,max-age=3600',
      })
      response.end(bytes)
    } else {
      response.writeHead(404)
      response.end('missing')
    }
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/nested/game/`
}, 30_000)
afterAll(async () => {
  if (server) {
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
})

test('original PNG pack matches its authored hashes and the canonical Studio manifest', () => {
  const parsed = parseArenaManifest(canonical.manifest)
  expect(parsed).toHaveLength(3)
  for (const [index, asset] of pack.assets.entries()) {
    expect(createHash('sha256').update(pngs[index]!).digest('hex')).toBe(asset.sha256)
    expect(pngDimensions(pngs[index]!)).toEqual({ width: 640, height: 64 })
    validateCharacter(characters[asset.role], parsed[index]!, 640, 64)
  }
})

test('PNG dimensions are rejected before decode; entry paths cannot escape the project', () => {
  const bytes = new Uint8Array(pngs[0]!)
  new DataView(bytes.buffer).setUint32(16, ASSET_LIMITS.maxAxis + 1)
  expect(() => pngDimensions(bytes)).toThrow('dimensões')
  expect(() => pngDimensions(new Uint8Array(32))).toThrow('assinatura')
  const manifest = structuredClone(canonical.manifest)
  manifest.assets[0]!.path = 'public/../secrets.png'
  manifest.assets[0]!.url = '../secrets.png'
  expect(() => parseArenaManifest(manifest)).toThrow('caminho')
  manifest.assets[0]!.path = 'public/a.png'
  manifest.assets[0]!.url = 'https://external.test/a.png'
  expect(() => parseArenaManifest(manifest)).toThrow('caminho')
})

test('sheet indices, duplicate identity and named state bindings are validated', () => {
  const manifest = structuredClone(canonical.manifest)
  manifest.assets[0]!.sprite!.animations[0]!.to = 10
  const parsed = parseArenaManifest(manifest)
  expect(() => validateCharacter(characters.player, parsed[0]!, 640, 64)).toThrow('frame fora')
  expect(() =>
    validateCharacter(
      { ...characters.player, animations: { ...characters.player.animations, hurt: 'missing' } },
      parseArenaManifest(canonical.manifest)[0]!,
      640,
      64,
    ),
  ).toThrow('ausente')
  manifest.assets[1]!.id = manifest.assets[0]!.id
  expect(() => parseArenaManifest(manifest)).toThrow('identificador')
})

test('static images are valid; fixed bodies stay unchanged and optional sprite boxes use the full frame', () => {
  const entry = { ...parseArenaManifest(canonical.manifest)[0]!, sprite: undefined }
  validateCharacter(characters.player, entry, 640, 64)
  const character = {
    image: {} as CanvasImageSource,
    width: 640,
    height: 64,
    binding: characters.player,
    resourceKey: 'test',
  } satisfies LoadedCharacter
  expect(characterBody(character)).toBeUndefined()
  expect(
    characterBody({
      ...character,
      sprite: { frameW: 64, frameH: 64, animations: [] },
      binding: { ...characters.player, collision: 'sprite' },
    }),
  ).toEqual({ offsetX: -26, offsetY: -26, width: 52, height: 52 })
  expect(
    characterBody({
      ...character,
      sprite: {
        frameW: 64,
        frameH: 64,
        animations: [],
        hitbox: { x: 0.25, y: 0.125, w: 0.5, h: 0.75 },
      },
      binding: { ...characters.player, collision: 'sprite' },
    }),
  ).toEqual({ offsetX: -13, offsetY: -19.5, width: 26, height: 39 })
})

test('animation advances without one-frame-per-update loss and clamps a non-looping end', () => {
  expect(advanceAnimation({ name: 'walk', from: 2, to: 5, fps: 8, loop: true }, 1)).toEqual({
    frame: 2,
    finished: false,
  })
  expect(advanceAnimation({ name: 'death', from: 7, to: 9, fps: 10, loop: false }, 99)).toEqual({
    frame: 9,
    finished: true,
  })
  expect(frameRect(pack.assets[0]!.sprite, 640, 64, 9)).toEqual({
    x: 576,
    y: 0,
    width: 64,
    height: 64,
  })
  expect(() => frameRect(pack.assets[0]!.sprite, 640, 64, 10)).toThrow('fora')
})

test('presentation saturates without changing logical events and expires all resources', () => {
  const effects = createEffects()
  const event: ArenaEvent = { type: 'defeat', tick: 1, x: 25, y: 40, entityId: 1, kind: 'seeker' }
  const input = Array.from({ length: 1000 }, () => ({ ...event }))
  effects.add(input, { reducedQuality: false, reducedMotion: false })
  expect(effects.list.length).toBe(MAX_EFFECTS)
  expect(input[0]).toEqual(event)
  for (let frame = 0; frame < 30; frame++) effects.advance(0.05)
  expect(effects.list).toHaveLength(0)
  effects.add(input, { reducedQuality: true, reducedMotion: true })
  expect(effects.list.length).toBe(64)
  expect(effects.list.every((effect) => effect.kind !== 'spark')).toBe(true)
  effects.reset()
  expect(effects.list).toHaveLength(0)
})

test('browser integration: real PNG decode, revision invalidation, timeout cleanup and rendering', async () => {
  const child = Bun.spawn(
    [
      'node',
      '--experimental-strip-types',
      fileURLToPath(new URL('../scripts/verify-browser.ts', import.meta.url)),
      base,
    ],
    { stdout: 'pipe', stderr: 'pipe' },
  )
  const timeout = setTimeout(() => child.kill(), 25_000)
  try {
    const [code, output, errors] = await Promise.all([
      child.exited,
      Bun.readableStreamToText(child.stdout),
      Bun.readableStreamToText(child.stderr),
    ])
    if (code !== 0) throw new Error(`${output}\n${errors}`)
    expect(output).toContain('pass 5')
  } finally {
    clearTimeout(timeout)
  }
}, 30_000)
