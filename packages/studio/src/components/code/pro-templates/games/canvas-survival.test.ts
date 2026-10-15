import { expect, test } from 'bun:test'
import {
  parseArenaManifest,
  validateCharacter,
} from '../../../../../pro-kits/canvas-survival/src/assets'
import { characters } from '../../../../../pro-kits/canvas-survival/src/characters'
import { PRO_ASSET_MANIFEST } from '../../../../core/proAssetPaths'
import { buildProAssetBundle } from '../../../../core/proAssets'
import { buildSourceFiles } from '../../../../export/sourceExport'
import { sanitizeStoredProject } from '../../../../state/projectValidation'
import { createGameTree } from '../games'
import { createProProject, loadProTemplate } from '../index'

test('game dispatch rejects incompatible metadata instead of substituting another game', async () => {
  const arena = await loadProTemplate('canvas-survival')
  const puzzle = await loadProTemplate('canvas-puzzle')
  await expect(createGameTree({ ...arena, engine: 'phaser' })).rejects.toThrow('incompatível')
  await expect(createGameTree({ ...puzzle, engine: 'three' })).rejects.toThrow('incompatível')
  await expect(loadProTemplate('unknown-canvas-game')).rejects.toThrow('desconhecido')
  expect(arena.tree['src/model.ts']).toBeDefined()
  expect(puzzle.tree['src/model.ts']).not.toEqual(arena.tree['src/model.ts'])
})

test('arena is a complete, independently editable project with cloned material metadata', async () => {
  const first = await createProProject('01CANVAS000000000000000001', 'Arena', 'canvas-survival')
  const second = await createProProject(
    '01CANVAS000000000000000002',
    'Outra arena',
    'canvas-survival',
  )
  expect(first.assets).toHaveLength(3)
  first.assets![0]!.sprite!.animations[0]!.fps = 99
  first.tree!['src/config.ts'] = { kind: 'file', content: 'editado' }
  expect(second.assets![0]!.sprite!.animations[0]!.fps).toBe(4)
  expect(second.tree!['src/config.ts']).not.toEqual(first.tree!['src/config.ts'])
  const third = await loadProTemplate('canvas-survival')
  expect(third.assets[0]!.sprite!.animations[0]!.fps).toBe(4)
})

test('native JSON roundtrip preserves every source, material ID, image, license and sprite', async () => {
  const project = await createProProject('01CANVAS000000000000000003', 'Arena', 'canvas-survival')
  const restored = sanitizeStoredProject(JSON.parse(JSON.stringify(project)))!
  expect(restored.kind).toBe('pro')
  expect(restored.proMeta).toEqual(project.proMeta)
  expect(restored.tree).toEqual(project.tree)
  expect(restored.assets).toEqual(project.assets)
  const bundle = await buildProAssetBundle(restored.assets, restored.tree)
  const manifest = parseArenaManifest(bundle.manifest)
  for (const binding of Object.values(characters)) {
    const entry = manifest.find((asset) => asset.id === binding.assetId)!
    expect(entry).toBeDefined()
    validateCharacter(binding, entry, entry.width!, entry.height!)
  }
})

test('source export projects the canonical asset manifest and a matching npm lock root', async () => {
  const project = await createProProject('01CANVAS000000000000000004', 'Arena', 'canvas-survival')
  const { files, warnings } = await buildSourceFiles(project)
  expect(warnings).toEqual([])
  expect(files[PRO_ASSET_MANIFEST]).toBeDefined()
  const kit = JSON.parse(String(files['studio-kit.json']))
  expect(kit.assets).toBe(PRO_ASSET_MANIFEST)
  const pkg = JSON.parse(String(files['package.json']))
  const lock = JSON.parse(String(files['package-lock.json']))
  expect(lock.name).toBe(pkg.name)
  expect(lock.packages[''].devDependencies).toEqual(pkg.devDependencies)
  expect(lock.packages['node_modules/vite'].version).toBe(pkg.devDependencies.vite)
  expect(lock.packages['node_modules/typescript'].version).toBe(pkg.devDependencies.typescript)
  expect(files['README.md']).toContain('src/characters.ts')
  expect(Object.keys(files).filter((path) => path.endsWith('.png'))).toHaveLength(3)
  expect(Object.keys(files).some((path) => path.startsWith('node_modules/'))).toBe(false)
})
