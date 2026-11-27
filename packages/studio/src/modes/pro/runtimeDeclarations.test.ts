import { expect, test } from 'bun:test'
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
