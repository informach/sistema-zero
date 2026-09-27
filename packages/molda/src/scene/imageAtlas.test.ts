import { expect, test } from 'bun:test'
import { makeSceneAtlasDocument } from '../testing/sceneAtlasFixture'
import { convertSceneNodesToMesh, groupSceneNodes, setSceneNodeFlag } from './commands'
import { compositeSceneImage, sceneBaseColor, scenePalette } from './composite'
import type {
  MoldaSceneDocument,
  SceneGeometry,
  SceneImage,
  SceneMeshGeometry,
  Vec2,
} from './document'
import { bakeSceneImageAtlas, packSceneImageAtlas, sceneAtlasUv } from './imageAtlas'
import { applySceneImageAtlas, prepareSceneImageAtlas } from './imageAtlasCommands'
import { SCENE_LIMITS } from './limits'
import { parametricMesh } from './parametricGeometry'
import { readSceneDocument } from './readDocument'

function sequence() {
  let id = 0
  return () => `atlas_${++id}`
}
function texel(pixels: Uint8Array, width: number, x: number, y: number) {
  return pixels.slice((y * width + x) * 4, (y * width + x + 1) * 4)
}

test('atlas packing is deterministic and preserves every composed pixel, corners and replicated edges without transparent gaps', () => {
  const document = makeSceneAtlasDocument()
  const plan = prepareSceneImageAtlas(document, 'body')
  const snapshot = structuredClone(document)
  const raster = bakeSceneImageAtlas(plan.images, plan.tiles, plan.palette)
  expect(packSceneImageAtlas(plan.images, plan.tiles)).toEqual(plan.layout)
  for (const slot of plan.layout.slots) {
    const image = plan.images.find((i) => i.id === slot.imageId)!
    const expected = compositeSceneImage(image, plan.palette, slot.base)
    for (let y = -1; y <= image.height; y++)
      for (let x = -1; x <= image.width; x++) {
        expect(texel(raster.pixels, raster.width, slot.x + x, slot.y + y)).toEqual(
          texel(
            expected,
            image.width,
            Math.max(0, Math.min(image.width - 1, x)),
            Math.max(0, Math.min(image.height - 1, y)),
          ),
        )
      }
    for (const uv of [
      [0, 0],
      [1, 1],
      [0.5 / image.width, 0.5 / image.height],
    ] as Vec2[]) {
      const mapped = sceneAtlasUv(plan.layout, slot, uv)
      expect(
        texel(
          raster.pixels,
          raster.width,
          Math.floor(mapped[0] * raster.width),
          Math.floor(mapped[1] * raster.height),
        ),
      ).toEqual(
        texel(
          expected,
          image.width,
          Math.min(image.width - 1, Math.floor(uv[0] * image.width)),
          Math.min(image.height - 1, Math.floor(uv[1] * image.height)),
        ),
      )
    }
  }
  for (let i = 3; i < raster.pixels.length; i += 4) expect(raster.pixels[i]).toBe(255)
  expect(document).toEqual(snapshot)
  expect(() =>
    packSceneImageAtlas(
      [{ id: 'large', width: 1024, height: 1 }],
      [{ imageId: 'large', base: [0, 0, 0, 0] }],
    ),
  ).toThrow('não couberam')
})

test('atlas refuses to change opaque/transparent render classification, but keeps alpha for uniformly transparent tiles', () => {
  const image = (id: string, alpha: number): SceneImage => ({
    id,
    name: id,
    width: 2,
    height: 1,
    encoding: 'rgba',
    layers: [
      {
        id: 'layer',
        name: 'layer',
        opacity: 0.5,
        visible: true,
        pixels: new Uint8Array([255, 0, 0, alpha, 0, 255, 0, alpha]),
      },
    ],
  })
  const images = [image('a', 128), image('b', 255)]
  const tiles = images.map((image) => ({
    imageId: image.id,
    base: [0, 0, 0, 0] as [number, number, number, number],
  }))
  expect(
    bakeSceneImageAtlas(images, tiles, [[0, 0, 0, 0]]).pixels.some(
      (_, i, pixels) => i % 4 === 3 && pixels[i]! < 255,
    ),
  ).toBe(true)
  tiles[1]!.base = [1 / 7, 0.123456789123, 0.4, 1]
  expect(() => bakeSceneImageAtlas(images, tiles, [[0, 0, 0, 0]])).toThrow('opacas e transparentes')
})

test.each([
  'box',
  'wedge',
  'cylinder',
  'path',
  'mesh',
] as const)('atlas keeps %s authorial geometry and sampled appearance while isolating shared, locked users', (kind) => {
  let document: MoldaSceneDocument = makeSceneAtlasDocument()
  const base = document.geometries[0]!
  if (base.kind !== 'box') throw new Error('Missing box')
  const sides = [base.surfaces.py!, base.surfaces.px!]
  let geometry: SceneGeometry =
    kind === 'path'
      ? {
          id: base.id,
          kind,
          points: [
            { id: 'a', position: [0, 0, 0] },
            { id: 'b', position: [0, 2, 0] },
          ],
          radius: 0.5,
          around: 8,
          endCaps: true,
          surfaces: { side: sides[0], top: sides[1] },
        }
      : {
          ...base,
          kind: kind === 'mesh' ? 'box' : kind,
          surfaces:
            kind === 'cylinder'
              ? { side: sides[0], top: sides[1] }
              : kind === 'wedge'
                ? { slope: sides[0], px: sides[1] }
                : base.surfaces,
        }
  document = { ...document, geometries: [geometry, ...document.geometries.slice(1)] }
  if (kind === 'mesh') document = convertSceneNodesToMesh(document, ['body'], sequence())
  geometry = document.geometries[0]!
  document = {
    ...document,
    nodes: [...document.nodes, { ...document.nodes[0]!, id: 'shared', locked: true }],
  }
  document = setSceneNodeFlag(document, ['wing'], 'locked', true)
  expect(readSceneDocument(document).status).toBe('valid')
  const plan = prepareSceneImageAtlas(document, 'body')
  const raster = bakeSceneImageAtlas(plan.images, plan.tiles, plan.palette)
  const next = applySceneImageAtlas(document, plan, raster, sequence())
  const node = next.nodes[0]!
  if (node.kind !== 'mesh') throw new Error('Missing node')
  const result = next.geometries.find((g) => g.id === node.geometryId)!
  expect(result.kind).toBe(kind)
  expect(next.geometries[0]).toBe(geometry)
  expect(next.nodes.slice(1)).toEqual(document.nodes.slice(1))
  expect(next.images.slice(0, document.images.length)).toEqual(document.images)
  expect(next.images[0]).toBe(document.images[0])
  expect(next.materials.slice(0, document.materials.length)).toEqual(document.materials)
  const beforeMesh = geometry.kind === 'mesh' ? geometry : parametricMesh(geometry).mesh
  const afterMesh = result.kind === 'mesh' ? result : parametricMesh(result).mesh
  expect(afterMesh.vertices).toEqual(beforeMesh.vertices)
  expect(afterMesh.looseEdges).toEqual(beforeMesh.looseEdges)
  for (const [id, face] of Object.entries(beforeMesh.faces)) {
    const oldMaterial = document.materials.find(
      (m) => m.id === (face.materialId ?? plan.node.materialId),
    )!
    const changedFace = afterMesh.faces[id]!
    const material = next.materials.find(
      (m) => m.id === (changedFace.materialId ?? node.materialId),
    )!
    if (!oldMaterial.colorImageId) {
      expect(changedFace).toEqual(face)
      expect(material).toBe(oldMaterial)
      continue
    }
    expect([material.roughness, material.metalness, material.doubleSided]).toEqual([
      oldMaterial.roughness,
      oldMaterial.metalness,
      oldMaterial.doubleSided,
    ])
    const image = document.images.find((i) => i.id === oldMaterial.colorImageId)!
    const pixels = compositeSceneImage(
      image,
      scenePalette(document),
      sceneBaseColor(oldMaterial, scenePalette(document)),
    )
    const uv = face.corners.reduce<Vec2>(
      (sum, corner) => [
        sum[0] + corner.uv[0] / face.corners.length,
        sum[1] + corner.uv[1] / face.corners.length,
      ],
      [0, 0],
    )
    const mapped = changedFace.corners.reduce<Vec2>(
      (sum, corner) => [
        sum[0] + corner.uv[0] / face.corners.length,
        sum[1] + corner.uv[1] / face.corners.length,
      ],
      [0, 0],
    )
    // Sampling at exact texel boundaries depends on floating arithmetic; test stable interior points separately above.
    const expectedMapped = sceneAtlasUv(
      plan.layout,
      plan.layout.slots[plan.tileByMaterial.get(oldMaterial.id)!]!,
      uv,
    )
    expect(mapped[0]).toBeCloseTo(expectedMapped[0], 14)
    expect(mapped[1]).toBeCloseTo(expectedMapped[1], 14)
    expect(pixels.byteLength).toBe(image.width * image.height * 4)
  }
  const added = next.images.at(-1)!
  expect(added.layers[0]!.pixels).not.toBe(raster.pixels)
  expect(readSceneDocument(next).status).toBe('valid')
  expect(() => applySceneImageAtlas({ ...document }, plan, raster)).toThrow('mudou')
})

test('atlas preflight rejects inherited locks, outside UV and aggregate paint budget before publishing; exact tile keys deduplicate only identical base colors', () => {
  const document = makeSceneAtlasDocument()
  expect(() =>
    prepareSceneImageAtlas(setSceneNodeFlag(document, ['body'], 'locked', true), 'body'),
  ).toThrow('Destrave')
  const meshDocument = convertSceneNodesToMesh(document, ['body'], sequence())
  const geometry = meshDocument.geometries[0] as SceneMeshGeometry
  const face = Object.values(geometry.faces).find((f) => f.materialId)!
  face.corners[0]!.uv[0] = -Number.MIN_VALUE
  expect(() => prepareSceneImageAtlas(meshDocument, 'body')).toThrow('fora da imagem')
  const plan = prepareSceneImageAtlas(document, 'body')
  const usedBytes = document.images.reduce(
    (n, i) => n + i.layers.reduce((n, l) => n + l.pixels.length, 0),
    0,
  )
  const extras: SceneImage[] = []
  let remaining = SCENE_LIMITS.pixelBytes - usedBytes
  while (remaining > 0) {
    const width = remaining >= 1024 ? 1024 : remaining,
      height = Math.min(1024, Math.floor(remaining / width))
    const pixels = width * height
    extras.push({
      id: `extra${extras.length}`,
      name: 'Extra',
      width,
      height,
      encoding: 'indexed',
      layers: [
        { id: 'layer', name: 'layer', visible: true, opacity: 1, pixels: new Uint8Array(pixels) },
      ],
    })
    remaining -= pixels
  }
  const full = { ...document, images: [...document.images, ...extras] }
  expect(readSceneDocument(full).status).toBe('valid')
  expect(() => prepareSceneImageAtlas(full, 'body')).toThrow('espaço para pintura')
  expect(plan.images).toHaveLength(2)
  const box = document.geometries[0]!
  if (box.kind !== 'box') throw new Error('Missing box')
  const first = [...plan.materials.values()][0]!
  const twin = { ...first, id: 'twin', roughness: 0.2 }
  const withTwin = {
    ...document,
    materials: [...document.materials, twin],
    geometries: [
      {
        ...box,
        surfaces: {
          ...box.surfaces,
          nz: {
            materialId: twin.id,
            uv: { origin: [0, 0] as Vec2, u: [1, 0] as Vec2, v: [0, 1] as Vec2 },
          },
        },
      },
      ...document.geometries.slice(1),
    ],
  }
  expect(prepareSceneImageAtlas(withTwin, 'body').tiles).toHaveLength(2)
  twin.baseColor = { kind: 'rgba', value: [1 / 7, 0.123456789123, 0.3, 1] }
  expect(prepareSceneImageAtlas(withTwin, 'body').tiles).toHaveLength(3)
  const grouped = groupSceneNodes(document, ['body'], { nextId: sequence() })
  expect(() =>
    prepareSceneImageAtlas(
      setSceneNodeFlag(grouped, [grouped.nodes.at(-1)!.id], 'locked', true),
      'body',
    ),
  ).toThrow('Destrave')
  const sphere: MoldaSceneDocument = {
    ...document,
    geometries: [
      { ...box, kind: 'sphere', surfaces: { around: box.surfaces.py } },
      ...document.geometries.slice(1),
    ],
  }
  expect(readSceneDocument(sphere).status).toBe('valid')
  expect(() => prepareSceneImageAtlas(sphere, 'body')).toThrow('duas imagens')
})
