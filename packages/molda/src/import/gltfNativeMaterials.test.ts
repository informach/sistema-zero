import { expect, test } from 'bun:test'
import { Color, DataTexture, Mesh, NoColorSpace, SRGBColorSpace } from 'three'
import { srgbToLinear } from '../core/color'
import { createModelAsset } from '../core/model'
import { GlbBinary } from '../export/GlbBinary'
import { encodeGlbContainer } from '../export/glbContainer'
import { encodePng } from '../export/png'
import { encodeSceneGlb } from '../export/sceneGlb'
import { compositeSceneImage, sceneBaseColor, scenePalette } from '../scene/composite'
import { SCENE_LIMITS } from '../scene/limits'
import { sceneMaterialImageBase } from '../scene/materialImages'
import { migrateLegacyModel } from '../scene/migrateLegacy'
import { readSceneDocument, readSceneImage, readSceneMaterial } from '../scene/readDocument'
import { expectValidGlb } from '../testing/gltfValidation'
import { makePngFixture } from '../testing/pngFixture'
import { makeSceneGlbFixture } from '../testing/sceneGlbFixture'
import { SceneRenderResource } from '../viewport/sceneRenderResource'
import { readGltfDocument } from './gltfDocument'
import { convertGltfGeometries } from './gltfGeometries'
import { convertGltfHierarchy } from './gltfHierarchy'
import { GLTF_INPUT_LIMITS, GltfInputError } from './gltfInput'
import { convertGltfMaterials } from './gltfNativeMaterials'
import { decodeGltfRasters } from './gltfRasters'
import { selectGltfDocument } from './gltfSelection'

const nearest = { magFilter: 9728, minFilter: 9728, wrapS: 33071, wrapT: 33071 }
const png = encodePng(new Uint8Array([64, 124, 231, 64, 255, 20, 0, 0]), 2, 1)
function fixture(
  materials: Array<Record<string, unknown>>,
  options: {
    used?: Array<number | null>
    images?: Uint8Array[]
    textures?: Array<Record<string, unknown>>
    samplers?: Array<Record<string, unknown>>
  } = {},
) {
  const binary = new GlbBinary(),
    POSITION = binary.floats(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), 'VEC3', true, 34962),
    TEXCOORD_0 = binary.floats(new Float32Array([0, 0, 1, 0, 0, 1]), 'VEC2', false, 34962),
    TEXCOORD_1 = binary.floats(
      new Float32Array([0.25, 0.5, 0.75, 0.5, 0.25, 1]),
      'VEC2',
      false,
      34962,
    ),
    images = (options.images ?? []).map((image, i) => ({
      name: `Imagem ${i}`,
      bufferView: binary.addView(image),
      mimeType: 'image/png',
    })),
    used = options.used ?? materials.map((_, i) => i),
    bytes = encodeGlbContainer(
      {
        asset: { version: '2.0' },
        buffers: [{ byteLength: binary.byteLength }],
        bufferViews: binary.views,
        accessors: binary.accessors,
        ...(materials.length ? { materials } : {}),
        ...(images.length
          ? {
              images,
              samplers: options.samplers ?? [nearest],
              textures: options.textures ?? images.map((_, i) => ({ source: i, sampler: 0 })),
            }
          : {}),
        ...(used.length
          ? {
              meshes: [
                {
                  primitives: used.map((material) => ({
                    attributes: { POSITION, TEXCOORD_0, TEXCOORD_1 },
                    ...(material === null ? {} : { material }),
                  })),
                },
              ],
              nodes: [{ mesh: 0 }],
            }
          : {}),
      },
      binary.segments,
    )
  return stages(bytes)
}
function stages(bytes: Uint8Array) {
  const read = readGltfDocument(bytes)
  if (read.status !== 'ready') throw new Error('Self-contained fixture expected')
  const source = read.document,
    selection = selectGltfDocument(source, source.graph.defaultScene),
    decoded = decodeGltfRasters(source.resources.images, selection.dependencies.images)
  return {
    bytes,
    source,
    selection,
    decoded,
    convert: () => convertGltfMaterials(source, selection, decoded),
  }
}
function native(f: ReturnType<typeof stages>, converted: ReturnType<typeof convertGltfMaterials>) {
  const requests = f.selection.variants.map((variant, i) => ({
      ...variant,
      geometryId: `shape_${i}`,
    })),
    geometry = convertGltfGeometries(
      f.source.meshes,
      f.source.accessors,
      requests,
      converted.geometry,
    ),
    hierarchy = convertGltfHierarchy(f.source, f.selection, {
      geometryIds: requests.map((r) => r.geometryId),
      defaultMaterialId: converted.geometry.defaultId,
    })
  return {
    ...migrateLegacyModel(createModelAsset({ name: 'Importado', starter: false, now: 1 })).document,
    nodes: hierarchy.nodes,
    geometries: geometry.geometries,
    materials: converted.materials,
    images: converted.images,
  }
}
function fails(run: () => unknown, reason: GltfInputError['reason'], path?: string) {
  let error: unknown
  try {
    run()
  } catch (caught) {
    error = caught
  }
  expect(error).toBeInstanceOf(GltfInputError)
  if (!(error instanceof GltfInputError)) throw new Error('Expected structured failure')
  expect(error.reason).toBe(reason)
  if (path) expect(error.path).toBe(path)
}
function validate(converted: ReturnType<typeof convertGltfMaterials>) {
  const budget = { pixels: 0, layers: 0 }
  for (const material of converted.materials)
    expect(readSceneMaterial(material, 'material', 32)).toEqual(material)
  for (const image of converted.images)
    expect(readSceneImage(image, 'image', budget, 32)).toEqual(image)
  expect(budget.pixels).toBe(converted.pixelBytes)
}

test('untextured factors preserve continuous color and alpha semantics, with a real glTF default material', () => {
  const factor = [0.0031308, 0.2, 1, 0.125],
    f = fixture(
      [
        {
          name: 'Original',
          pbrMetallicRoughness: {
            baseColorFactor: factor,
            roughnessFactor: 0.375,
            metallicFactor: 0.625,
          },
          doubleSided: true,
        },
        {
          name: 'Transparente',
          alphaMode: 'BLEND',
          pbrMetallicRoughness: { baseColorFactor: factor },
        },
        {},
      ],
      { used: [0, 1, 2, null] },
    ),
    before = structuredClone(f.source),
    result = f.convert()
  expect(result.materials).toHaveLength(4)
  for (let i = 0; i < 2; i++) {
    const material = result.materials[i]!
    if (material.baseColor.kind !== 'rgba') throw new Error('RGBA expected')
    for (let c = 0; c < 3; c++)
      expect(srgbToLinear(material.baseColor.value[c]! * 255)).toBeCloseTo(factor[c]!, 14)
    expect(material.baseColor.value[3]).toBe(i ? 0.125 : 1)
    expect((material.baseColor.value[1]! * 255) % 1 === 0).toBe(false)
  }
  expect(result.materials[0]).toMatchObject({
    roughness: 0.375,
    metalness: 0.625,
    doubleSided: true,
  })
  expect(result.materials[2]!.baseColor).toEqual({ kind: 'rgba', value: [1, 1, 1, 1] })
  expect(result.materials[3]).toMatchObject({
    id: result.geometry.defaultId,
    roughness: 1,
    metalness: 1,
  })
  expect(result.images).toEqual([])
  expect(result.geometry.uvSetByMaterial?.size).toBe(0)
  validate(result)
  expect(readSceneDocument(native(f, result))).toMatchObject({ status: 'valid' })
  expect(f.source).toEqual(before)
})

test('bakes base color in linear space, never premultiplies alpha or places a solid background under paint', () => {
  const factor = [0.2, 1, 0.7, 0.5],
    f = fixture(
      [
        {
          name: 'Cor',
          alphaMode: 'BLEND',
          pbrMetallicRoughness: {
            baseColorFactor: factor,
            baseColorTexture: { index: 0, texCoord: 1 },
          },
        },
        {
          name: 'Opaco',
          pbrMetallicRoughness: {
            baseColorFactor: factor,
            baseColorTexture: { index: 0, texCoord: 1 },
          },
        },
      ],
      { images: [png] },
    ),
    before = structuredClone(f.decoded),
    result = f.convert()
  const expected = new Color(64 / 255, 124 / 255, 231 / 255).convertSRGBToLinear()
  expected.r *= 0.2
  expected.b *= 0.7
  expected.convertLinearToSRGB()
  const rgb = expected.toArray().map((v) => Math.round(v * 255))
  expect(Array.from(result.images[0]!.layers[0]!.pixels.slice(0, 4))).toEqual([...rgb, 32])
  expect(Array.from(result.images[1]!.layers[0]!.pixels.slice(0, 4))).toEqual([...rgb, 255])
  expect(result.images[1]!.layers[0]!.pixels[7]).toBe(255)
  const document = native(f, result),
    palette = scenePalette(document)
  for (const [i, material] of result.materials.entries()) {
    expect(material.baseColor).toEqual({ kind: 'rgba', value: [0, 0, 0, 0] })
    const composite = compositeSceneImage(
      result.images[i]!,
      palette,
      sceneBaseColor(material, palette),
    )
    expect(composite[3]).toBe(i ? 255 : 32)
    expect(composite[7]).toBe(i ? 255 : 0)
  }
  expect(result.issues.map((i) => i.code)).toEqual([
    'base-color-factor-baked',
    'base-color-factor-baked',
  ])
  expect(result.geometry.uvSetByMaterial?.get(0)).toBe(1)
  const face = document.geometries[0]
  if (face?.kind !== 'mesh') throw new Error('Mesh expected')
  expect(face.faces.p_0_f_0?.corners[0]?.uv).toEqual([0.25, 0.5])
  validate(result)
  expect(f.decoded).toEqual(before)
})

test('linear data ignores source alpha, shares surface channels, and uses separate color-space resources in the renderer', () => {
  const f = fixture(
      [
        {
          name: 'Completo',
          alphaMode: 'BLEND',
          pbrMetallicRoughness: {
            baseColorTexture: { index: 0 },
            metallicRoughnessTexture: { index: 0 },
            roughnessFactor: 0.4,
            metallicFactor: 0.6,
          },
          normalTexture: { index: 0, scale: 2 },
        },
      ],
      { images: [png] },
    ),
    result = f.convert(),
    document = native(f, result)
  expect(result.images).toHaveLength(2)
  const material = result.materials[0]!
  expect(material.normalImageId).toBe(material.roughnessImageId)
  expect(material.metalnessImageId).toBe(material.roughnessImageId)
  expect(material.colorImageId === material.normalImageId).toBe(false)
  expect(result.images[1]!.layers[0]!.pixels).toEqual(
    new Uint8Array([64, 124, 231, 255, 255, 20, 0, 255]),
  )
  expect(result.issues).toEqual([])
  validate(result)
  expect(readSceneDocument(document)).toMatchObject({ status: 'valid' })
  const resource = new SceneRenderResource()
  try {
    resource.update(document)
    let found = false
    resource.root.traverse((object) => {
      if (!(object instanceof Mesh)) return
      for (const gpu of Array.isArray(object.material) ? object.material : [object.material]) {
        if (gpu.name !== 'Completo') continue
        found = true
        expect(gpu.map instanceof DataTexture).toBe(true)
        expect(gpu.map.colorSpace).toBe(SRGBColorSpace)
        expect(gpu.normalMap.colorSpace).toBe(NoColorSpace)
        expect(gpu.roughnessMap.colorSpace).toBe(NoColorSpace)
        expect(gpu.metalnessMap).toBe(gpu.roughnessMap)
        expect(gpu.normalMap.image.data).toEqual(result.images[1]!.layers[0]!.pixels)
        expect(gpu.normalScale.toArray()).toEqual([2, -2])
        expect(gpu.roughness).toBe(0.4)
        expect(gpu.metalness).toBe(0.6)
        expect(gpu.transparent).toBe(true)
        expect(gpu.depthWrite).toBe(false)
      }
    })
    expect(found).toBe(true)
  } finally {
    resource.dispose()
  }
})

test('reports sixteen-bit surface quantization while rejecting sixteen-bit base color required to be eight-bit by glTF', () => {
  const image = makePngFixture({
      width: 2,
      height: 1,
      colorType: 6,
      depth: 16,
      samples: [0, 128, 65535, 0, 32768, 257, 129, 65000],
    }).bytes,
    f = fixture(
      [
        {
          name: 'Dados',
          normalTexture: { index: 0 },
          pbrMetallicRoughness: { metallicRoughnessTexture: { index: 0 } },
        },
      ],
      { images: [image] },
    ),
    result = f.convert()
  expect(result.images[0]!.layers[0]!.pixels).toEqual(
    new Uint8Array([0, 0, 255, 255, 128, 1, 1, 255]),
  )
  expect(result.issues).toEqual([
    { code: 'rgba16-to-rgba8', path: 'images[0]', targetId: 'gltf_image_0' },
  ])
  validate(result)
  const invalid = fixture([{ pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }], {
    images: [image],
  })
  fails(invalid.convert, 'invalid', 'materials[0].pbrMetallicRoughness.baseColorTexture')
})

test('retains image sharing by exact raster interpretation without sharing edited buffers with source or a second conversion', () => {
  const f = fixture(
      [
        {
          name: 'Um',
          alphaMode: 'BLEND',
          pbrMetallicRoughness: { baseColorTexture: { index: 0 } },
        },
        {
          name: 'Dois',
          alphaMode: 'BLEND',
          pbrMetallicRoughness: { baseColorTexture: { index: 0 } },
        },
        { name: 'Três', pbrMetallicRoughness: { baseColorTexture: { index: 0 } } },
      ],
      { images: [png] },
    ),
    first = f.convert(),
    second = f.convert()
  expect(first.images).toHaveLength(2)
  expect(first.materials[0]!.colorImageId).toBe(first.materials[1]!.colorImageId)
  expect(first.materials[0]!.colorImageId === first.materials[2]!.colorImageId).toBe(false)
  first.images[0]!.layers[0]!.pixels[0] = 99
  expect(second.images[0]!.layers[0]!.pixels[0]).toBe(64)
  expect(first.images[1]!.layers[0]!.pixels[0]).toBe(64)
  expect(f.decoded.rasters[0]!.rgba[0]).toBe(64)
  first.materials[0]!.name = 'Editado'
  expect(second.materials[0]!.name).toBe('Um')
})

test('reports sampler choices, omitted lighting channels and bounded source names without pretending to preserve them', () => {
  const f = fixture(
      [
        {
          name: `${'a'.repeat(127)}😀mais`,
          pbrMetallicRoughness: { baseColorTexture: { index: 0 } },
          normalTexture: { index: 0, scale: 0 },
          occlusionTexture: { index: 0, strength: 0 },
          emissiveTexture: { index: 0 },
        },
        {},
      ],
      { images: [png], textures: [{ source: 0 }] },
    ),
    result = f.convert()
  expect(result.materials[0]!.name).toBe('a'.repeat(127))
  expect(result.materials[1]!.name).toBe('Material 2')
  expect(result.materials[0]!.normalStrength).toBe(0)
  expect(result.issues.map((i) => i.code)).toEqual([
    'name-shortened',
    'sampler-filter-nearest',
    'sampler-wrap-clamp',
    'sampler-filter-nearest',
    'sampler-wrap-clamp',
    'occlusion-omitted',
    'emissive-omitted',
    'name-generated',
  ])
  for (const entry of result.issues) expect(entry.path.startsWith('materials[')).toBe(true)
  validate(result)
})

test('all eight-bit channel values match an independent color oracle through factor baking', () => {
  const pixels = Uint8Array.from({ length: 256 * 4 }, (_, i) => Math.floor(i / 4)),
    image = encodePng(pixels, 256, 1),
    factors = [0, 0.0031308, 0.2, 0.7, 1],
    f = fixture(
      factors.map((factor) => ({
        name: 'Escala',
        alphaMode: 'BLEND',
        pbrMetallicRoughness: {
          baseColorFactor: [factor, factor, factor, factor],
          baseColorTexture: { index: 0 },
        },
      })),
      { images: [image] },
    ),
    result = f.convert()
  for (const [i, factor] of factors.entries()) {
    const actual = result.images[i]!.layers[0]!.pixels
    for (let channel = 0; channel <= 255; channel++) {
      const oracle = new Color(channel / 255, channel / 255, channel / 255)
        .convertSRGBToLinear()
        .multiplyScalar(factor)
        .convertLinearToSRGB()
      const expected = factor === 1 ? channel : Math.round(oracle.r * 255)
      expect(actual[channel * 4]).toBe(expected)
      expect(actual[channel * 4 + 1]).toBe(expected)
      expect(actual[channel * 4 + 2]).toBe(expected)
      expect(actual[channel * 4 + 3]).toBe(Math.round(channel * factor))
    }
  }
  expect(f.decoded.rasters[0]!.rgba).toEqual(pixels)
})

test('aliases to one encoded interval share one native image and explicitly report collapsed identity', () => {
  const seed = fixture(
      [
        { name: 'Primeiro', normalTexture: { index: 0 } },
        {
          name: 'Segundo',
          normalTexture: { index: 0 },
          pbrMetallicRoughness: { metallicRoughnessTexture: { index: 0 } },
        },
      ],
      { images: [png] },
    ),
    json = seed.source.source.json,
    originalImage = (json.images as Array<Record<string, unknown>>)[0]!,
    materials = structuredClone(json.materials) as Array<Record<string, unknown>>
  materials[1]!.normalTexture = { index: 1 }
  materials[1]!.pbrMetallicRoughness = { metallicRoughnessTexture: { index: 1 } }
  const f = stages(
      encodeGlbContainer(
        {
          ...json,
          materials,
          images: [originalImage, { ...originalImage, name: 'Outro nome' }],
          textures: [
            { source: 0, sampler: 0 },
            { source: 1, sampler: 0 },
          ],
        },
        seed.source.resources.buffers,
      ),
    ),
    result = f.convert()
  expect(f.decoded.rasters).toHaveLength(1)
  expect(result.images).toHaveLength(1)
  expect(result.images[0]!.name).toBe('Imagem 0')
  expect(result.materials[0]!.normalImageId).toBe(result.materials[1]!.normalImageId)
  expect(result.issues).toEqual([
    { code: 'image-alias-shared', path: 'images[1]', targetId: 'gltf_image_0' },
  ])
  validate(result)
})

test('MASK keeps alpha factors outside RGBA8, exact cutoff decisions and colors hidden under zero alpha', async () => {
  const pixels = Uint8Array.from({ length: 256 * 4 }, (_, i) =>
    i % 4 === 3 ? Math.floor(i / 4) : (i * 73 + 17) % 256,
  )
  const image = encodePng(pixels, 256, 1)
  for (const opacity of [0, Number.MIN_VALUE, 0.37123456789, 1]) {
    for (const cutoff of [0, Number.MIN_VALUE, 0.1, 0.37123456789, 1, 1.1]) {
      const f = fixture(
        [
          {
            name: 'Folhas',
            alphaMode: 'MASK',
            alphaCutoff: cutoff,
            pbrMetallicRoughness: {
              baseColorFactor: [1, 1, 1, opacity],
              baseColorTexture: { index: 0 },
            },
          },
        ],
        { images: [image] },
      )
      const before = f.bytes.slice()
      const converted = f.convert()
      const material = converted.materials[0]!
      expect(material.alphaMask).toEqual({ cutoff, opacity })
      expect(converted.images[0]!.layers[0]!.pixels).toEqual(pixels)
      expect(converted.issues).toEqual([])
      const composed = compositeSceneImage(converted.images[0]!, [], [0, 0, 0, 0], true)
      expect(composed).toEqual(pixels)
      for (let alpha = 0; alpha < 256; alpha++)
        expect((composed[alpha * 4 + 3]! / 255) * material.alphaMask!.opacity >= cutoff).toBe(
          (alpha / 255) * opacity >= cutoff,
        )
      validate(converted)
      const document = native(f, converted)
      expect(readSceneDocument(document).status).toBe('valid')
      const exported = encodeSceneGlb(document, { allowLosses: true })
      await expectValidGlb(exported.bytes)
      const reopened = stages(exported.bytes)
      expect(reopened.source.appearance.materials[0]).toMatchObject({
        alphaMode: 'MASK',
        alphaCutoff: cutoff,
        baseColorFactor: [1, 1, 1, opacity],
      })
      expect(reopened.convert().images[0]!.layers[0]!.pixels).toEqual(pixels)
      expect(f.bytes).toEqual(before)
    }
  }
})

test('MASK image identity ignores its live alpha factor, but separates baked BLEND and OPAQUE variants', () => {
  const f = fixture(
    ['MASK', 'MASK', 'BLEND', 'OPAQUE'].map((alphaMode, i) => ({
      alphaMode,
      pbrMetallicRoughness: {
        baseColorFactor: [1, 1, 1, i === 1 ? 0.2 : 0.7],
        baseColorTexture: { index: 0 },
      },
    })),
    { images: [png] },
  )
  const converted = f.convert()
  expect(converted.images).toHaveLength(3)
  expect(converted.materials[0]!.colorImageId).toBe(converted.materials[1]!.colorImageId)
  expect(converted.materials[0]!.alphaMask).toEqual({ cutoff: 0.5, opacity: 0.7 })
  expect(converted.materials[1]!.alphaMask).toEqual({ cutoff: 0.5, opacity: 0.2 })
  expect(converted.materials[2]!.alphaMask).toBeUndefined()
  expect(converted.materials[3]!.alphaMask).toBeUndefined()
})

test('refuses unrepresentable modes and references before reading any pixel values', () => {
  for (const [material, textures, path] of [
    [{ normalTexture: { index: 0, scale: -1 } }, undefined, 'normalTexture.scale'],
    [{ normalTexture: { index: 0, scale: 4.1 } }, undefined, 'normalTexture.scale'],
    [
      {
        normalTexture: { index: 0, texCoord: 1 },
        pbrMetallicRoughness: { baseColorTexture: { index: 0 } },
      },
      undefined,
      'normalTexture.texCoord',
    ],
    [{ normalTexture: { index: 0 } }, [{}], 'normalTexture'],
  ] as Array<[Record<string, unknown>, Array<Record<string, unknown>> | undefined, string]>) {
    const f = fixture([material], { images: [png], textures })
    for (const raster of f.decoded.rasters)
      Object.defineProperty(raster, 'rgba', {
        get(): Uint8Array {
          throw new Error('Pixels accessed too early')
        },
      })
    fails(f.convert, 'unsupported', `materials[0].${path}`)
  }
  const f = fixture([{ normalTexture: { index: 0 } }], { images: [png] })
  f.decoded.images.clear()
  fails(f.convert, 'invalid', 'materials[0].normalTexture')
})

test('budgets converted variants, not only unique decoded images, before accessing pixel buffers', () => {
  const f = fixture(
    Array.from({ length: 9 }, (_, i) => ({
      name: `Cor ${i}`,
      pbrMetallicRoughness: {
        baseColorFactor: [(i + 1) / 10, 1, 1, 1],
        baseColorTexture: { index: 0 },
      },
    })),
    { images: [png] },
  )
  f.decoded.rasters[0] = {
    width: 1024,
    height: 1024,
    depth: 8,
    get rgba(): Uint8Array {
      throw new Error('Pixels accessed before all variants were budgeted')
    },
  }
  fails(f.convert, 'budget', 'materials[8].pbrMetallicRoughness.baseColorTexture')
  const excess = {
    ...f.selection,
    dependencies: {
      ...f.selection.dependencies,
      materials: Array<number>(SCENE_LIMITS.materials + 1).fill(0),
    },
  }
  fails(() => convertGltfMaterials(f.source, excess, f.decoded), 'budget', 'materials')
  const exact = fixture(
    Array.from({ length: 8 }, (_, i) => ({
      name: `Cor ${i}`,
      pbrMetallicRoughness: {
        baseColorFactor: [(i + 1) / 10, 1, 1, 1],
        baseColorTexture: { index: 0 },
      },
    })),
    { images: [png] },
  )
  const pixels = new Uint8Array(1024 * 1024 * 4).fill(255)
  let reads = 0
  exact.decoded.rasters[0] = {
    width: 1024,
    height: 1024,
    depth: 8,
    get rgba() {
      reads++
      return pixels
    },
  }
  const result = exact.convert()
  expect(result.pixelBytes).toBe(SCENE_LIMITS.pixelBytes)
  expect(result.images).toHaveLength(8)
  expect(reads).toBe(8)
  expect(result.images[0]!.layers[0]!.pixels[0]).toBe(89)
  expect(result.images[7]!.layers[0]!.pixels[0]).toBe(231)
  expect(pixels[0]).toBe(255)
})

test('source indices can be sparse and large without charging unselected materials or touching their data', () => {
  const last = GLTF_INPUT_LIMITS.appearanceItems - 1,
    f = fixture(
      Array.from({ length: last + 1 }, () => ({ name: 'Existente' })),
      { used: [last] },
    )
  Object.defineProperty(f.source.appearance.materials, 0, {
    get() {
      throw new Error('Unselected material read')
    },
  })
  const result = f.convert()
  expect(result.geometry.ids.size).toBe(1)
  expect(result.geometry.ids.get(last)).toBe(`gltf_material_${last}`)
  expect(result.materials).toHaveLength(1)
  expect(result.geometry.defaultId).toBe(`gltf_material_${last}`)
  expect(readSceneDocument(native(f, result))).toMatchObject({ status: 'valid' })
  const empty = fixture([], { used: [] }).convert()
  expect(empty.materials).toEqual([])
  expect(empty.images).toEqual([])
  const onlyDefault = fixture([], { used: [null] }).convert()
  expect(onlyDefault.materials).toHaveLength(1)
  expect(onlyDefault.materials[0]!.metalness).toBe(1)
})

test('real GLB color and detail maps round-trip through conversion, native composition and export', async () => {
  const authored = makeSceneGlbFixture(2, 2, 3, 2),
    material = authored.materials[0]!
  material.normalImageId = material.colorImageId
  material.roughnessImageId = material.colorImageId
  material.metalnessImageId = material.colorImageId
  material.normalStrength = 0.75
  material.baseColor = { kind: 'rgba', value: [0, 0, 0, 0] }
  authored.images[0]!.layers[0]!.pixels[3] = 64
  authored.animations = []
  const bytes = encodeSceneGlb(authored, { allowLosses: true }).bytes
  await expectValidGlb(bytes, ['MESH_PRIMITIVE_GENERATED_TANGENT_SPACE'])
  const f = stages(bytes),
    result = f.convert(),
    document = native(f, result)
  expect(result.issues.filter((i) => !i.code.startsWith('name-'))).toEqual([])
  expect(readSceneDocument(document)).toMatchObject({ status: 'valid' })
  const palette = scenePalette(authored),
    convertedPalette = scenePalette(document)
  for (const kind of ['color', 'normal', 'roughness', 'metalness'] as const) {
    const key = `${kind}ImageId` as const,
      originalImage = authored.images.find((image) => image.id === material[key])!,
      convertedMaterial = result.materials[0]!,
      convertedImage = result.images.find((image) => image.id === convertedMaterial[key])!
    const actual = compositeSceneImage(
        convertedImage,
        convertedPalette,
        sceneMaterialImageBase(convertedMaterial, convertedPalette, kind),
      ),
      expected = compositeSceneImage(
        originalImage,
        palette,
        sceneMaterialImageBase(material, palette, kind),
      )
    // Packed glTF surface data carries roughness in G and metalness in B, not R.
    if (kind === 'roughness' || kind === 'metalness') {
      const channel = kind === 'roughness' ? 1 : 2
      for (let offset = channel; offset < actual.length; offset += 4)
        expect(actual[offset]).toBe(expected[offset])
    } else {
      // Compare the represented tangent-space vector, not bytes divorced from their Y convention.
      if (kind === 'normal' && !!convertedMaterial.normalFlipY !== !!material.normalFlipY)
        for (let offset = 1; offset < expected.length; offset += 4)
          expected[offset] = 255 - expected[offset]!
      expect(actual).toEqual(expected)
    }
  }
  const exported = encodeSceneGlb(document, { allowLosses: true }).bytes
  await expectValidGlb(exported, ['MESH_PRIMITIVE_GENERATED_TANGENT_SPACE'])
  const again = stages(exported).convert()
  expect(again.images.map((image) => image.layers[0]!.pixels)).toEqual(
    result.images.map((image) => image.layers[0]!.pixels),
  )
})
