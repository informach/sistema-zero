import { expect, test } from 'bun:test'
import sharp from 'sharp'
import { Color, Mesh, MeshStandardMaterial, SRGBColorSpace } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import type { MoldaSceneDocument, SceneImage, SceneMaterial } from '../scene/document'
import { buildSceneGeometry } from '../scene/geometry'
import { list, record } from '../scene/validation'
import { readAccessor, readGlb, readImage } from '../testing/glbRead'
import { expectValidGlb } from '../testing/gltfValidation'
import { animatedScene } from '../testing/sceneAnimation'
import { makeSceneGridGeometry } from '../testing/sceneFixtures'
import { GlbBinary, MAX_SCENE_GLB_BYTES } from './GlbBinary'
import { encodeGlbContainer } from './glbContainer'
import { encodeSceneGlb } from './sceneGlb'
import { SceneGlbLossError } from './sceneGlbReport'

function fixture(): MoldaSceneDocument {
  const base = animatedScene(),
    node = base.nodes[0]!
  return {
    ...base,
    animations: [],
    nodes: [{ ...node, kind: 'mesh', geometryId: 'surface', materialId: 'material' }],
    geometries: [makeSceneGridGeometry(2)],
    images: [],
    mirrors: [],
    materials: [
      {
        id: 'material',
        name: 'Acabamento',
        baseColor: { kind: 'rgba', value: [0.4, 0.2, 0.8, 1] },
        roughness: 0.45,
        metalness: 0.7,
        doubleSided: false,
      },
    ],
  }
}
function rows(value: unknown) {
  return list(value, 'rows', 65536).map((row) => record(row, 'row'))
}
function image(
  id: string,
  width: number,
  height: number,
  color: (x: number, y: number) => number[],
): SceneImage {
  const pixels = new Uint8Array(width * height * 4)
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) pixels.set(color(x, y), (y * width + x) * 4)
  return {
    id,
    name: id,
    width,
    height,
    encoding: 'rgba',
    layers: [
      {
        id: `${id}-layer`,
        name: 'Camada',
        visible: true,
        opacity: 1,
        pixels,
      },
    ],
  }
}
async function png(bytes: Uint8Array, index: number) {
  const decoded = await sharp(Buffer.from(readImage(readGlb(bytes), index)))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  return { ...decoded.info, rgba: new Uint8Array(decoded.data) }
}

test('native GLB keeps shared local geometry, nested affine/mirrored nodes and real Three materials; official validator passes', async () => {
  const source = fixture(),
    node = source.nodes[0]!
  source.nodes = [
    { ...node, parentId: 'group' },
    { ...node, id: 'copy', parentId: 'group' },
    {
      id: 'group',
      name: 'Grupo',
      kind: 'group',
      parentId: null,
      locked: false,
      hidden: false,
      transform: {
        kind: 'affine',
        matrix: [1, 0, 0, 0, 0.3, 2, 0, 0, -0.2, 0.1, -1, 0, 3, 4, 1, 1],
      },
    },
  ]
  source.mirrors = [{ id: 'mirror', name: 'Espelho', axis: 'x', offset: 2, sourceId: node.id }]
  const before = structuredClone(source),
    result = encodeSceneGlb(source)
  await expectValidGlb(result.bytes)
  expect(result.issues).toEqual([])
  expect(result.stats).toMatchObject({
    meshes: 1,
    materials: 1,
    textures: 0,
    triangles: 24,
    drawCalls: 3,
    renderedParts: 3,
  })
  expect(encodeSceneGlb(source).bytes).toEqual(result.bytes)
  const parsed = readGlb(result.bytes),
    buffers = buildSceneGeometry(source.geometries[0]!)
  expect(readAccessor(parsed, 0)).toEqual(buffers.positions)
  expect(readAccessor(parsed, 1)).toEqual(buffers.normals)
  expect(readAccessor(parsed, 2)).toEqual(
    buffers.uvs.map((value, i) => (i % 2 ? 1 - value : value)),
  )
  const loaded = await new GLTFLoader().parseAsync(result.bytes.slice().buffer, '')
  const found: Mesh[] = []
  loaded.scene.traverse((object) => {
    if (object instanceof Mesh) found.push(object)
  })
  expect(found).toHaveLength(3)
  expect(found[0]!.geometry).toBe(found[1]!.geometry)
  const material = found[0]!.material
  expect(material instanceof MeshStandardMaterial).toBe(true)
  if (!(material instanceof MeshStandardMaterial)) throw new Error('Material esperado')
  const expected = new Color().setRGB(0.4, 0.2, 0.8, SRGBColorSpace)
  expect(material.color.r).toBeCloseTo(expected.r, 7)
  expect(material.color.g).toBeCloseTo(expected.g, 7)
  expect(material.color.b).toBeCloseTo(expected.b, 7)
  expect(material.roughness).toBe(0.45)
  expect(material.metalness).toBe(0.7)
  expect(source).toEqual(before)
  const unique = new Set(found.map((mesh) => mesh.geometry))
  for (const geometry of unique) geometry.dispose()
  material.dispose()
})

test('per-face materials form reusable mesh variants without duplicating geometry accessor buffers', async () => {
  const source = fixture(),
    geometry = makeSceneGridGeometry(2)
  geometry.faces.f_0_0!.materialId = 'second'
  source.geometries = [geometry]
  source.materials.push({ ...source.materials[0]!, id: 'second', name: 'Outro', metalness: 0 })
  const node = source.nodes[0]!
  source.nodes.push({
    ...node,
    id: 'copy',
    kind: 'mesh',
    geometryId: geometry.id,
    materialId: 'second',
  })
  const result = encodeSceneGlb(source)
  await expectValidGlb(result.bytes)
  expect(result.stats).toMatchObject({ meshes: 2, materials: 2, drawCalls: 4, triangles: 16 })
  const json = readGlb(result.bytes).json
  expect(rows(json.accessors)).toHaveLength(5)
  const [first, second] = rows(json.meshes).map((mesh) => rows(mesh.primitives))
  expect(first!.map((primitive) => primitive.indices)).toEqual(
    second!.map((primitive) => primitive.indices),
  )
  expect(first!.map((primitive) => primitive.attributes)).toEqual(
    second!.map((primitive) => primitive.attributes),
  )
  expect(first![1]!.material).not.toBe(second![1]!.material)
})

test('PNG embeds upright source-over rows, neutral data backgrounds, normal convention plus V reflection, and exact NEAREST channel packing', async () => {
  const source = fixture()
  const color = image('color', 2, 2, (x, y) => [x * 255, y * 255, 64, x ? 255 : 128])
  const normal = image('normal', 2, 1, (x) => [32, x ? 240 : 15, 240, 255])
  const rough = image('rough', 2, 1, (x) => [0, x ? 210 : 80, 1, 255])
  const metal = image('metal', 3, 2, (x, y) => [1, 0, x * 70 + y * 20, 255])
  source.images = [color, normal, rough, metal]
  source.materials = [
    {
      ...source.materials[0]!,
      baseColor: { kind: 'rgba', value: [0, 0, 1, 0.5] },
      colorImageId: 'color',
      normalImageId: 'normal',
      normalFlipY: true,
      normalStrength: 0.3,
      roughnessImageId: 'rough',
      metalnessImageId: 'metal',
    },
  ]
  const original = structuredClone(source)
  expect(() => encodeSceneGlb(source)).toThrow(SceneGlbLossError)
  const result = encodeSceneGlb(source, { allowLosses: true })
  expect(result.issues).toEqual([{ code: 'runtime-tangent-space', sourceId: 'material' }])
  await expectValidGlb(result.bytes, ['MESH_PRIMITIVE_GENERATED_TANGENT_SPACE'])
  expect(result.stats).toMatchObject({ textures: 3, pixelBytes: (4 + 2 + 12) * 4 })
  const material = rows(readGlb(result.bytes).json.materials)[0]!
  expect(material.alphaMode).toBe('BLEND')
  expect(record(material.pbrMetallicRoughness, 'pbr').baseColorFactor).toEqual([1, 1, 1, 1])
  expect(material.normalTexture).toEqual({ index: 1, scale: 0.3 })
  const paint = await png(result.bytes, 0)
  const a = 128 / 255,
    alpha = a + 0.5 * (1 - a)
  expect(paint.rgba).toEqual(
    Uint8Array.from([
      0,
      Math.round((a / alpha) * 255),
      Math.round((((64 / 255) * a + 0.5 * (1 - a)) / alpha) * 255),
      Math.round(alpha * 255),
      255,
      255,
      64,
      255,
      0,
      0,
      Math.round((((64 / 255) * a + 0.5 * (1 - a)) / alpha) * 255),
      Math.round(alpha * 255),
      255,
      0,
      64,
      255,
    ]),
  )
  expect((await png(result.bytes, 1)).rgba).toEqual(
    Uint8Array.from([32, 15, 240, 255, 32, 240, 240, 255]),
  )
  const packed = await png(result.bytes, 2)
  expect([packed.width, packed.height]).toEqual([6, 2])
  for (let y = 0; y < 2; y++)
    for (let x = 0; x < 6; x++) {
      expect(packed.rgba[(y * 6 + x) * 4 + 1]).toBe(x < 3 ? 80 : 210)
      expect(packed.rgba[(y * 6 + x) * 4 + 2]).toBe(Math.floor(x / 2) * 70 + (1 - y) * 20)
    }
  expect(source).toEqual(original)
})

test('materials with identical image/base share PNG but distinct base colors do not tint existing paint', async () => {
  const source = fixture(),
    base = source.materials[0]!
  source.images = [image('paint', 2, 1, (x) => [255, 0, 0, x ? 255 : 0])]
  source.materials = [
    { ...base, colorImageId: 'paint' },
    { ...base, id: 'second', colorImageId: 'paint', roughness: 1 },
    {
      ...base,
      id: 'third',
      colorImageId: 'paint',
      baseColor: { kind: 'rgba', value: [0, 1, 0, 1] },
    },
  ]
  const node = source.nodes[0]!
  source.nodes = source.materials.map((material, i) => ({
    ...node,
    id: `node-${i}`,
    kind: 'mesh',
    geometryId: 'surface',
    materialId: material.id,
  }))
  const result = encodeSceneGlb(source)
  await expectValidGlb(result.bytes)
  expect(result.stats.textures).toBe(2)
  const materials = rows(readGlb(result.bytes).json.materials).map((material) =>
    record(material.pbrMetallicRoughness, 'pbr'),
  )
  expect(materials.map((material) => material.baseColorTexture)).toEqual([
    { index: 0 },
    { index: 0 },
    { index: 1 },
  ])
  expect((await png(result.bytes, 1)).rgba).toEqual(
    Uint8Array.from([0, 255, 0, 255, 255, 0, 0, 255]),
  )
})

test('hidden nodes, invalid faces, loose geometry and flipbooks require explicit loss acceptance and preserve source', async () => {
  const source = fixture(),
    geometry = makeSceneGridGeometry(1),
    node = source.nodes[0]!
  geometry.vertices.loose = [2, 2, 2]
  geometry.looseEdges.push(['loose', 'v_0_0'])
  geometry.faces.bad = {
    corners: ['v_0_0', 'v_1_0', 'v_0_0'].map((vertexId) => ({ vertexId, uv: [0, 0] })),
  }
  source.geometries = [geometry]
  source.nodes.push({ ...node, id: 'hidden', hidden: true })
  const paint = image('paint', 2, 2, (x, y) => [x * 255, y * 255, 255, 255])
  paint.flipbook = { frameWidth: 1, frameHeight: 1, frames: [1, 3], fps: 3, loop: true }
  source.images = [paint]
  source.materials[0]!.colorImageId = paint.id
  const before = structuredClone(source)
  expect(() => encodeSceneGlb(source)).toThrow(SceneGlbLossError)
  const result = encodeSceneGlb(source, { allowLosses: true })
  await expectValidGlb(result.bytes)
  expect(result.issues).toEqual([
    { code: 'hidden-node', sourceId: 'hidden' },
    { code: 'face-omitted', sourceId: 'surface', faceId: 'bad', reason: 'degenerate' },
    { code: 'loose-geometry', sourceId: 'surface', vertices: 1, edges: 1 },
    { code: 'flipbook-first-frame', sourceId: 'paint' },
  ])
  const frame = await png(result.bytes, 0)
  expect([frame.width, frame.height]).toEqual([1, 1])
  expect(frame.rgba).toEqual(Uint8Array.from([255, 255, 255, 255]))
  expect(source).toEqual(before)
})

test('empty and locator-only scenes use valid JSON-only GLB, without empty accessors or zero-byte BIN', async () => {
  const source = fixture()
  source.nodes = []
  await expectValidGlb(encodeSceneGlb(source).bytes)
  source.nodes = [
    {
      id: 'point',
      name: 'Ponto',
      kind: 'locator',
      hidden: false,
      locked: false,
      parentId: null,
      transform: { kind: 'trs', translation: [1, 2, 3], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
    },
  ]
  const result = encodeSceneGlb(source)
  await expectValidGlb(result.bytes)
  const loaded = await new GLTFLoader().parseAsync(result.bytes.slice().buffer, '')
  expect(loaded.scene.children[0]?.position.toArray()).toEqual([1, 2, 3])
  const view = new DataView(result.bytes.buffer)
  expect(view.getUint32(12, true) + 20).toBe(result.bytes.length)
})

test('export budgets reject incompatible map grids, output pixel growth and oversized BIN/container', () => {
  const source = fixture()
  source.images = [image('a', 33, 1, () => [0, 0, 0, 255]), image('b', 32, 1, () => [0, 0, 0, 255])]
  source.materials[0]!.roughnessImageId = 'a'
  source.materials[0]!.metalnessImageId = 'b'
  expect(() => encodeSceneGlb(source)).toThrow('tamanhos compatíveis')
  source.images = [image('paint', 1024, 1024, () => [0, 0, 0, 0])]
  const base: SceneMaterial = { ...fixture().materials[0]!, colorImageId: 'paint' }
  source.materials = Array.from({ length: 9 }, (_, i) => ({
    ...base,
    id: `mat-${i}`,
    baseColor: { kind: 'rgba', value: [i / 10, 0, 0, 1] },
  }))
  const node = source.nodes[0]!
  source.nodes = source.materials.map((material, i) => ({
    ...node,
    id: `node-${i}`,
    kind: 'mesh',
    geometryId: 'surface',
    materialId: material.id,
  }))
  expect(() => encodeSceneGlb(source)).toThrow('orçamento de pixels')
  const binary = new GlbBinary(),
    bytes = new Uint8Array(MAX_SCENE_GLB_BYTES)
  binary.addView(bytes)
  expect(() => binary.addView(new Uint8Array(1))).toThrow('tamanho permitido')
  expect(() =>
    encodeGlbContainer({ asset: { version: '2.0' } }, [bytes], MAX_SCENE_GLB_BYTES),
  ).toThrow('tamanho permitido')
})
