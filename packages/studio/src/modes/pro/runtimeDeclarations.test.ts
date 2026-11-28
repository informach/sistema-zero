import { expect, test } from 'bun:test'
import { verifyStudioProPlatformFiles } from '@sistemazero/core/studio/pro-revision'
import libraries from '../../monaco/pro/defaultLibraries.json'
import { createProLanguageService } from '../../monaco/pro/languageService'
import { mapTwoDRegionalEngineBootstrap } from '../../official-extensions/map-2d/regionBootstrap'
import {
  proRuntimeDeclarations,
  withKnownProRuntimeDeclarations,
  withProRuntimeDeclarations,
} from './runtimeDeclarations'

for (const [id, global] of [
  ['game-2d', 'SZGame2D'],
  ['game-2d-advanced', 'SZGameKit'],
] as const) {
  test(`the ${id} portable API types map callbacks and diagnoses authored mistakes`, () => {
    const service = createProLanguageService(libraries)
    const files = {
      ...proRuntimeDeclarations(id),
      'tsconfig.json': JSON.stringify({
        compilerOptions: { strict: true, target: 'ESNext', skipLibCheck: true },
        include: ['src'],
      }),
      'src/main.ts': `${global}.createMapScene('mapa', 'vila'); ${global}.mapArea('mapa', {}, 'door', porta => { const x: number = porta.x; console.log(x) }); window.__SZProjectLifecycle.begin(() => {}); ctx.fillRect(0, 0, 1, 1);`,
    }
    service.update(files)
    expect(service.diagnostics('src/main.ts')).toEqual([])
    service.update({ ...files, 'src/main.ts': `${global}.mapSize('mapa', 'depth');` })
    expect(service.diagnostics('src/main.ts').some((d) => d.code === 2345)).toBe(true)
  })
}

test('a known converted engine receives portable declarations without changing its authored files', async () => {
  const engine = await mapTwoDRegionalEngineBootstrap('g2d')
  const files = { 'public/sz-ext/game-2d.js': engine, 'public/script.js': 'console.log(1)' }
  const before = JSON.stringify(files)
  const derived = await withKnownProRuntimeDeclarations(files)
  expect(derived['src/sz-platform/globals-game-2d.d.ts']).toContain('GameTwoDRuntimeApi')
  expect(derived['public/sz-ext/game-2d.js']).toBe(engine)
  expect(JSON.stringify(files)).toBe(before)
  const changed = { ...files, 'public/sz-ext/game-2d.js': engine + '\n// edited' }
  expect(await withKnownProRuntimeDeclarations(changed)).toEqual(changed)
})

test('a declaration path already used by authored code is refused and preserved', () => {
  const files = { 'src/sz-platform/globals-game-2d.d.ts': 'authored content' }
  const before = JSON.stringify(files)
  expect(() => withProRuntimeDeclarations(files, 'game-2d')).toThrow('original foi preservado')
  expect(JSON.stringify(files)).toBe(before)
})

test('editor provenance removes only compiled-library semantic diagnostics, retaining authored errors and stale-proof checks', async () => {
  const path = 'public/sz-ext/game-2d.js'
  const engine = await mapTwoDRegionalEngineBootstrap('g2d')
  const files = {
    ...proRuntimeDeclarations('game-2d'),
    [path]: engine,
    'public/closed.js': '/** @type {number} */ const wrong = "bad";',
    'tsconfig.json': JSON.stringify({
      compilerOptions: {
        strict: true,
        target: 'ESNext',
        allowJs: true,
        checkJs: true,
        skipLibCheck: true,
      },
      include: ['src', 'public'],
    }),
  }
  const platform = await verifyStudioProPlatformFiles(files)
  const service = createProLanguageService(libraries)
  service.update(files)
  expect(service.diagnostics(path).length).toBeGreaterThan(0)
  expect(service.diagnostics(path, platform)).toEqual([])
  expect(service.diagnostics('public/closed.js', platform).some((d) => d.code === 2322)).toBe(true)
  service.update({ ...files, [path]: 'function authoredEngine(value) { return value }' })
  expect(service.diagnostics(path, platform).some((d) => d.code === 7006)).toBe(true)
  service.update({ ...files, [path]: 'function broken( {' })
  expect(service.diagnostics(path, platform).some((d) => d.code === 1005)).toBe(true)
})
