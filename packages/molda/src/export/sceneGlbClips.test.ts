import { expect, test } from 'bun:test'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { list, record } from '../scene/validation'
import { readGlb } from '../testing/glbRead'
import { expectValidGlb } from '../testing/gltfValidation'
import { makeSceneGlbFixture } from '../testing/sceneGlbFixture'
import { encodeSceneGlb } from './sceneGlb'
import { SceneGlbLossError } from './sceneGlbReport'

function fixture(names: string[]) {
  const source = makeSceneGlbFixture(1, 1, 3, 0),
    original = source.animations![0]!
  source.animations = names.map((name, i) => ({ ...original, id: `clip-${i}`, name }))
  return source
}

test('duplicate clip names require review, keep authorial names intact and do not steal existing names in the portable copy', async () => {
  const source = fixture(['Acenar', 'Acenar', 'Acenar (2)', 'Acenar']),
    before = structuredClone(source)
  expect(() => {
    encodeSceneGlb(source)
  }).toThrow(SceneGlbLossError)
  const result = encodeSceneGlb(source, { allowLosses: true })
  expect(result.issues).toEqual([
    { code: 'clip-renamed', sourceId: 'clip-1', originalName: 'Acenar', name: 'Acenar (3)' },
    { code: 'clip-renamed', sourceId: 'clip-3', originalName: 'Acenar', name: 'Acenar (4)' },
  ])
  expect(result.clips).toEqual(
    ['Acenar', 'Acenar (3)', 'Acenar (2)', 'Acenar (4)'].map((name, i) => ({
      id: `clip-${i}`,
      name,
      duration: 2,
      fps: 24,
      loop: true,
    })),
  )
  const loaded = await new GLTFLoader().parseAsync(result.bytes.slice().buffer, '')
  expect(loaded.animations.map((clip) => clip.name)).toEqual([
    'Acenar',
    'Acenar (3)',
    'Acenar (2)',
    'Acenar (4)',
  ])
  await expectValidGlb(result.bytes)
  expect(source).toEqual(before)
  expect(encodeSceneGlb(source, { allowLosses: true }).bytes).toEqual(result.bytes)
})

test('renaming a full-length Unicode name does not split a surrogate pair or rename a clipe that was omitted', () => {
  const name = `${'x'.repeat(123)}🚀abc`,
    source = fixture([name, name, name])
  source.animations![0]!.tracks = []
  const result = encodeSceneGlb(source, { allowLosses: true })
  const animations = list(readGlb(result.bytes).json.animations, 'animations', 64).map((row) =>
    record(row, 'animation'),
  )
  expect(animations.map((row) => row.name)).toEqual([name, `${'x'.repeat(123)} (2)`])
  expect(result.issues).toEqual([
    { code: 'clip-omitted', sourceId: 'clip-0', reason: 'empty' },
    {
      code: 'clip-renamed',
      sourceId: 'clip-2',
      originalName: name,
      name: `${'x'.repeat(123)} (2)`,
    },
  ])
  expect(result.clips.map((clip) => clip.id)).toEqual(['clip-1', 'clip-2'])
})

test('all 64 similarly named clips receive stable unique names within the text budget', () => {
  const source = fixture(Array(64).fill('Movimento'))
  const result = encodeSceneGlb(source, { allowLosses: true })
  expect(result.clips).toHaveLength(64)
  expect(result.stats.clips).toBe(64)
  expect(new Set(result.clips.map((clip) => clip.name)).size).toBe(64)
  expect(result.clips.at(-1)!.name).toBe('Movimento (64)')
  expect(result.issues).toHaveLength(63)
})
