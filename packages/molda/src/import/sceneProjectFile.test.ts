import { expect, test } from 'bun:test'
import { sceneToJson } from '../scene/documentJson'
import { readSceneDocument } from '../scene/readDocument'
import { bindSceneSkin } from '../scene/skinBinding'
import { makeSceneGlbFixture } from '../testing/sceneGlbFixture'
import { makeSceneSkinFixture } from '../testing/sceneSkin'
import {
  checkSceneProjectFileSize,
  copySceneProject,
  readSceneProjectFile,
  SCENE_PROJECT_FILE_LIMITS,
} from './sceneProjectFile'

const encode = (raw: unknown) => new TextEncoder().encode(JSON.stringify(raw))

test('native backup preserves editable layers, flipbook, geometry, hierarchy, animation and skin, then makes an independent new project', () => {
  const painted = makeSceneGlbFixture(2, 2, 3, 4, 2)
  const image = painted.images[0]
  if (!image) throw new Error('Missing image fixture')
  image.flipbook = { frameWidth: 2, frameHeight: 2, frames: [3, 1, 1, 0], fps: 12, loop: true }
  const hidden = image.layers[1]
  if (!hidden) throw new Error('Missing layer fixture')
  hidden.visible = false
  hidden.opacity = 0.25
  hidden.pixels.set([200, 100, 77, 0])
  const rig = makeSceneSkinFixture(),
    bound = { ...rig.document, skins: [bindSceneSkin(rig.document, rig.input)] }
  for (const source of [painted, bound]) {
    const before = structuredClone(source),
      bytes = encode(sceneToJson(source)),
      originalBytes = bytes.slice()
    const read = readSceneProjectFile(bytes)
    expect(read).toEqual(source)
    expect(readSceneDocument(read).status).toBe('valid')
    const copy = copySceneProject(read, '  Cópia para explorar  ')
    expect(copy.id === source.id).toBe(false)
    expect(copy.name).toBe('Cópia para explorar')
    expect(copy.createdAt).toBe(copy.updatedAt)
    expect(copy.nodes).toEqual(source.nodes)
    expect(copy.skins).toEqual(source.skins)
    expect(copy.animations).toEqual(source.animations)
    expect(copy.images).toEqual(source.images)
    if (copy.nodes[0]) copy.nodes[0].name = 'Só a cópia'
    copy.images[0]?.layers[0]?.pixels.fill(17)
    expect(source).toEqual(before)
    expect(read).toEqual(before)
    expect(bytes).toEqual(originalBytes)
  }
  const externalThumb = { ...painted, thumb: 'data:image/svg+xml,external-derived-preview' }
  expect(copySceneProject(externalThumb, 'Cópia').thumb).toBeUndefined()
  expect(externalThumb.thumb).toBe('data:image/svg+xml,external-derived-preview')
})

test('native file refuses damaged/future/legacy/non-UTF8 content, unknown fields, shared memory and oversized input without repair', () => {
  const source = sceneToJson(makeSceneGlbFixture(1, 1, 2, 2))
  for (const version of [1, 3, 999]) {
    expect(() => readSceneProjectFile(encode({ ...source, formatVersion: version }))).toThrow(
      expect.objectContaining({ reason: 'version' }),
    )
  }
  for (const bytes of [
    encode({ ...source, extra: 'must not drop' }),
    encode({ ...source, nodes: [{ invalid: true }] }),
    encode(null),
    new Uint8Array([0xff, 0xfe]),
    new Uint8Array(),
    new TextEncoder().encode('{broken'),
    new Uint8Array(new SharedArrayBuffer(2)),
  ])
    expect(() => readSceneProjectFile(bytes)).toThrow()
  for (const size of [0, -1, Number.NaN, 1.5])
    expect(() => checkSceneProjectFileSize(size)).toThrow()
  expect(() => checkSceneProjectFileSize(SCENE_PROJECT_FILE_LIMITS.bytes + 1)).toThrow(
    expect.objectContaining({ reason: 'budget' }),
  )
  checkSceneProjectFileSize(SCENE_PROJECT_FILE_LIMITS.bytes)
  expect(() =>
    readSceneProjectFile(
      new TextEncoder().encode('['.repeat(SCENE_PROJECT_FILE_LIMITS.jsonDepth + 1)),
    ),
  ).toThrow(expect.objectContaining({ reason: 'budget' }))
  // Invalid JSON would fail grammar, but its allocation preflight must win before JSON.parse.
  const structuralBomb = new Uint8Array(SCENE_PROJECT_FILE_LIMITS.jsonStructure + 1).fill(0x2c)
  expect(() => readSceneProjectFile(structuralBomb)).toThrow(
    expect.objectContaining({ reason: 'budget' }),
  )
  expect(() => copySceneProject(makeSceneGlbFixture(1, 1, 2, 0), '   ')).toThrow()
  expect(readSceneProjectFile(encode(source))).toEqual(makeSceneGlbFixture(1, 1, 2, 2))
})
