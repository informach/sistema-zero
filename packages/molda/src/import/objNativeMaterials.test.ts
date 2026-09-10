import { expect, test } from 'bun:test'
import {
  BufferGeometry,
  DataTexture,
  Float32BufferAttribute,
  Mesh,
  NoColorSpace,
  SRGBColorSpace,
  Vector3,
} from 'three'
import { encodePng } from '../export/png'
import { encodeSceneGlb } from '../export/sceneGlb'
import { compositeSceneImage, sceneBaseColor, scenePalette } from '../scene/composite'
import type { ModelSceneNode, MoldaSceneDocument } from '../scene/document'
import { SCENE_LIMITS } from '../scene/limits'
import { readSceneDocument, readSceneImage, readSceneMaterial } from '../scene/readDocument'
import { expectValidGlb } from '../testing/gltfValidation'
import { makePngFixture } from '../testing/pngFixture'
import { animatedScene } from '../testing/sceneAnimation'
import { SceneRenderResource } from '../viewport/sceneRenderResource'
import { readGltfDocument } from './gltfDocument'
import { decodeGltfRasters } from './gltfRasters'
import { type ObjAppearanceOptions, planObjAppearance } from './objAppearance'
import { readObjBundle } from './objBundle'
import { convertObjGeometries } from './objGeometries'
import { ObjInputError } from './objInput'
import type { ObjMaterialConversionOptions } from './objMaterialConversionTypes'
import { planObjMaterials } from './objMaterialSelection'
import { convertObjMaterials } from './objNativeMaterials'
import { decodeObjRasters } from './objRasters'

const bytes = (text: string) => new TextEncoder().encode(text),
  policy: ObjMaterialConversionOptions = {
    colorAlpha: 'multiply',
    normalY: 'positive',
    doubleSided: false,
  },
  appearanceOptions: ObjAppearanceOptions = {
    base: { rgbSpace: 'linear' },
    textures: { colorSpace: 'srgb', scalarSpace: 'linear' },
  },
  coords = 'v 0 0 0\nv 1 0 0\nv 0 1 0\nvt 0 0\nvt 1 0\nvt 0 1\n',
  face = 'f 1/1 2/2 3/3\n',
  raw = Uint8Array.of(64, 124, 231, 64, 255, 20, 0, 0),
  png = encodePng(raw, 2, 1)

function fixture(
  materials: Array<{ name: string; body: string }>,
  images: Array<{ path: string; bytes: Uint8Array }> = [],
  options = appearanceOptions,
  geometry = materials.map(({ name }) => `usemtl ${name}\n${face}`).join(''),
) {
  const bundle = readObjBundle(bytes(`mtllib m/a.mtl\n${coords}${geometry}`), [
    {
      path: 'm/a.mtl',
      bytes: bytes(materials.map(({ name, body }) => `newmtl ${name}\n${body}\n`).join('')),
    },
    ...images.map((image) => ({ ...image, path: `m/${image.path}` })),
  ])
  if (bundle.status !== 'ready') throw new Error('Fixture missing')
  const appearance = planObjAppearance(bundle, planObjMaterials(bundle), options),
    decoded = decodeObjRasters(bundle, appearance.references)
  return {
    bundle,
    appearance,
    decoded,
    convert: (options = policy) => convertObjMaterials(bundle, appearance, decoded, options),
  }
}
function native(
  f: ReturnType<typeof fixture>,
  result: ReturnType<typeof convertObjMaterials>,
): MoldaSceneDocument {
  const geometry = convertObjGeometries(f.bundle.source, result.geometry)
  return {
    ...animatedScene(),
    images: result.images,
    materials: result.materials,
    animations: [],
    skins: [],
    mirrors: [],
    geometries: geometry.parts.map((part) => part.geometry),
    nodes: geometry.parts.map(
      (part, i): ModelSceneNode => ({
        id: `part_${i}`,
        name: `Parte ${i}`,
        kind: 'mesh',
        parentId: null,
        hidden: false,
        locked: false,
        geometryId: part.geometry.id,
        materialId: result.geometry.defaultId,
        transform: {
          kind: 'trs',
          translation: [0, 0, 0],
          rotation: [0, 0, 0, 1],
          scale: [1, 1, 1],
        },
      }),
    ),
  }
}
function validate(result: ReturnType<typeof convertObjMaterials>) {
  const budget = { pixels: 0, layers: 0 }
  for (const material of result.materials)
    expect(readSceneMaterial(material, 'material', 32)).toEqual(material)
  for (const image of result.images)
    expect(readSceneImage(image, 'image', budget, 32)).toEqual(image)
  expect(budget.pixels).toBe(result.pixelBytes)
}
function fails(run: () => unknown, reason: ObjInputError['reason'], path?: string) {
  try {
    run()
  } catch (error) {
    expect(error).toBeInstanceOf(ObjInputError)
    if (!(error instanceof ObjInputError)) throw error
    expect(error.reason).toBe(reason)
    if (path) expect(error.path).toBe(path)
    return
  }
  throw new Error('Expected failure')
}
const pixels = (result: ReturnType<typeof convertObjMaterials>, id?: string) =>
  result.images.find((image) => image.id === (id ?? result.materials[0]!.colorImageId))!.layers[0]!
    .pixels!
// Independent formulas in the fixture, not a call back into production conversion.
const fromSrgb = (value: number) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  toSrgb = (value: number) =>
    value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055

test('OBJ solid materials retain continuous factors, shortened names, owned geometry and a nonmetallic default', () => {
  const name = `${'x'.repeat(127)}😀suffix`,
    f = fixture(
      [{ name, body: 'Kd .0031308 .2 1\nd .125\nPr .375\nPm .625' }],
      [],
      appearanceOptions,
      `usemtl ${name}\n${face}usemtl\nf 1 2 3\n`,
    ),
    before = structuredClone(f.bundle),
    result = f.convert(),
    first = result.materials[0]!
  expect(first.name).toBe('x'.repeat(127))
  expect(first).toMatchObject({
    roughness: 0.375,
    metalness: 0.625,
    baseColor: { value: [toSrgb(0.0031308), toSrgb(0.2), 1, 0.125] },
  })
  expect(result.materials[1]).toMatchObject({
    id: result.geometry.defaultId,
    roughness: 1,
    metalness: 0,
  })
  expect(result.images).toEqual([])
  expect(result.issues.some((issue) => issue.code === 'name-shortened')).toBe(true)
  validate(result)
  expect(readSceneDocument(native(f, result))).toMatchObject({ status: 'valid' })
  if (!(result.geometry.byFace instanceof Map)) throw new Error('Owned binding map expected')
  result.geometry.byFace.clear()
  expect(f.appearance.geometry.byFace!.size).toBe(2)
  expect(f.bundle).toEqual(before)
})

test('OBJ color and matte masks bake in linear light with straight alpha and no solid paint background', () => {
  const f = fixture(
      [{ name: 'Cor', body: 'Kd .2 1 .7\nd .5\nmap_Kd color.png\nmap_d -imfchan m mask.png' }],
      [
        { path: 'color.png', bytes: png },
        { path: 'mask.png', bytes: encodePng(Uint8Array.of(1, 2, 3, 128, 4, 5, 6, 200), 2, 1) },
      ],
    ),
    before = structuredClone(f.decoded),
    result = f.convert(),
    values = pixels(result),
    material = result.materials[0]!
  for (let i = 0; i < 2; i++)
    for (let c = 0; c < 3; c++)
      expect(values[i * 4 + c]).toBe(
        Math.round(toSrgb(fromSrgb(raw[i * 4 + c]! / 255) * [0.2, 1, 0.7][c]!) * 255),
      )
  expect(values[3]).toBe(Math.round(0.5 * (64 / 255) * (128 / 255) * 255))
  expect(values[7]).toBe(0)
  expect(values[4]).toBeGreaterThan(0)
  expect(material.baseColor).toEqual({ kind: 'rgba', value: [0, 0, 0, 0] })
  const document = native(f, result),
    palette = scenePalette(document),
    composed = compositeSceneImage(result.images[0]!, palette, sceneBaseColor(material, palette))
  expect(composed.slice(0, 4)).toEqual(values.slice(0, 4))
  // Compositing has no visible RGB at zero alpha; the editable layer still retains that RGB above.
  expect(composed.slice(4)).toEqual(Uint8Array.of(0, 0, 0, 0))
  const ignore = f.convert({ ...policy, colorAlpha: 'ignore' })
  expect(pixels(ignore)[3]).toBe(64)
  expect(pixels(ignore)[7]).toBe(100)
  expect(result.issues).toContainEqual({
    code: 'color-alpha-interpreted',
    path: 'files["m/a.mtl"].lines[4]',
    targetId: material.id,
    mode: 'multiply',
  })
  validate(result)
  expect(readSceneDocument(document)).toMatchObject({ status: 'valid' })
  expect(f.decoded).toEqual(before)
})

test('OBJ opacity-only bake applies range then explicit inversion before the material alpha, preserving RGB under zero alpha', () => {
  const f = fixture(
      [{ name: 'Máscara', body: 'Kd .25 .5 1\nTr .25\nmap_Tr -imfchan r -mm 1 -1 mask.png' }],
      [
        {
          path: 'mask.png',
          bytes: encodePng(Uint8Array.of(0, 250, 200, 255, 128, 250, 200, 0), 2, 1),
        },
      ],
      {
        ...appearanceOptions,
        textures: { ...appearanceOptions.textures, transparencyMap: 'transparency' },
      },
    ),
    result = f.convert()
  expect(pixels(result)).toEqual(
    Uint8Array.of(
      Math.round(toSrgb(0.25) * 255),
      Math.round(toSrgb(0.5) * 255),
      255,
      0,
      Math.round(toSrgb(0.25) * 255),
      Math.round(toSrgb(0.5) * 255),
      255,
      Math.round(0.75 * (128 / 255) * 255),
    ),
  )
  expect(result.materials[0]!.baseColor).toEqual({ kind: 'rgba', value: [0, 0, 0, 0] })
  validate(result)
})

test('OBJ color maps use their chosen linear/sRGB interpretation and range before Kd, with full sixteen-bit input precision', () => {
  const samples = [12345, 32768, 65535, 33000, 65535, 150, 0, 0],
    image = makePngFixture({ width: 2, height: 1, depth: 16, colorType: 6, samples }).bytes
  for (const space of ['linear', 'srgb'] as const) {
    const f = fixture(
        [
          {
            name: space,
            body: `Kd .7 .3 1\nd .333\nmap_Kd -colorspace ${space} -mm .1 .8 image.png`,
          },
        ],
        [{ path: 'image.png', bytes: image }],
      ),
      result = f.convert(),
      actual = pixels(result)
    for (let p = 0; p < 2; p++)
      for (let c = 0; c < 3; c++) {
        const source = samples[p * 4 + c]! / 65535,
          value = space === 'srgb' ? fromSrgb(source) : source
        expect(actual[p * 4 + c]).toBe(
          Math.round(toSrgb((0.1 + 0.8 * value) * [0.7, 0.3, 1][c]!) * 255),
        )
      }
    expect(actual[3]).toBe(Math.round(((0.333 * 33000) / 65535) * 255))
    expect(actual[7]).toBe(0)
    expect(result.issues.filter((issue) => issue.code === 'rgba16-to-rgba8')).toHaveLength(1)
    validate(result)
  }
})

test('OBJ scalar channel extraction separates transfer, Rec.709, matte, range and factors and shares equivalent rough/metal recipes', () => {
  const image = makePngFixture({
    width: 1,
    height: 1,
    depth: 16,
    colorType: 6,
    samples: [12345, 32768, 55000, 7777],
  }).bytes
  for (const space of ['linear', 'srgb'] as const)
    for (const channel of ['r', 'g', 'b', 'l', 'm'] as const) {
      const options = `-colorspace ${space} -imfchan ${channel} -mm .8 -.6 image.png`,
        f = fixture(
          [
            {
              name: `${space}-${channel}`,
              body: `Pr .2\nPm .3\nmap_Pr ${options}\nmap_Pm ${options}`,
            },
          ],
          [{ path: 'image.png', bytes: image }],
        ),
        result = f.convert(),
        material = result.materials[0]!,
        rgb = [12345, 32768, 55000].map((value) =>
          space === 'srgb' ? fromSrgb(value / 65535) : value / 65535,
        ),
        value =
          channel === 'm'
            ? 7777 / 65535
            : channel === 'l'
              ? rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722
              : rgb[channel === 'r' ? 0 : channel === 'g' ? 1 : 2]!,
        expected = Math.round((0.8 - 0.6 * value) * 255)
      expect(result.images).toHaveLength(1)
      expect(material.metalnessImageId).toBe(material.roughnessImageId)
      expect(pixels(result, material.roughnessImageId)).toEqual(
        Uint8Array.of(expected, expected, expected, 255),
      )
      expect(material.roughness).toBe(0.2)
      expect(material.metalness).toBe(0.3)
      validate(result)
    }
})

test('OBJ masks with another resolution reject before pixel reads, and explicit nearest bake samples output pixel centers in both axes', () => {
  const f = fixture(
      [{ name: 'Grades', body: 'map_Kd color.png\nmap_d -imfchan r mask.png' }],
      [
        { path: 'color.png', bytes: encodePng(new Uint8Array(3 * 3 * 4).fill(255), 3, 3) },
        {
          path: 'mask.png',
          bytes: encodePng(
            Uint8Array.of(10, 0, 0, 255, 20, 0, 0, 255, 30, 0, 0, 255, 40, 0, 0, 255),
            2,
            2,
          ),
        },
      ],
    ),
    raster = f.decoded.rasters[0]!,
    original = raster.rgba
  Object.defineProperty(raster, 'rgba', {
    configurable: true,
    get() {
      throw new Error('Read before metadata preflight')
    },
  })
  fails(() => f.convert(), 'unsupported', 'files["m/a.mtl"].lines[3]')
  Object.defineProperty(raster, 'rgba', { configurable: true, value: original })
  const result = f.convert({ ...policy, opacitySampling: 'nearest' })
  expect(Array.from(pixels(result)).filter((_, i) => i % 4 === 3)).toEqual([
    30, 40, 40, 30, 40, 40, 10, 20, 20,
  ])
  expect(result.issues).toContainEqual({
    code: 'opacity-resampled-nearest',
    path: 'files["m/a.mtl"].lines[3]',
    targetId: result.materials[0]!.id,
    source: [2, 2],
    target: [3, 3],
  })
  validate(result)
})

test('OBJ identical recipes share one image while color factors, channels and call ownership remain independent', () => {
  const f = fixture(
      [
        {
          name: 'A',
          body: 'map_Kd image.png\nmap_Pr -imfchan r image.png\nmap_Pm -imfchan r image.png',
        },
        { name: 'B', body: 'map_Kd image.png\nmap_Pr -imfchan g image.png' },
        { name: 'C', body: 'Kd .5 .5 .5\nmap_Kd image.png' },
      ],
      [{ path: 'image.png', bytes: png }],
    ),
    original = structuredClone(f.bundle),
    result = f.convert(),
    second = f.convert()
  expect(result.images).toHaveLength(4)
  expect(result.materials[0]!.colorImageId).toBe(result.materials[1]!.colorImageId)
  expect(result.materials[0]!.colorImageId === result.materials[2]!.colorImageId).toBe(false)
  expect(result.materials[0]!.roughnessImageId === result.materials[1]!.roughnessImageId).toBe(
    false,
  )
  expect(result.pixelBytes).toBe(32)
  result.images[0]!.layers[0]!.pixels!.fill(0)
  expect(pixels(second)[0]).toBe(64)
  expect(f.decoded.rasters[0]!.rgba).toEqual(raw)
  result.geometry.uvTransforms!.get(result.materials[0]!.id)!.offset[0] = 99
  expect(f.appearance.geometry.uvTransforms!.get(result.materials[0]!.id)!.offset[0]).toBe(0)
  expect(f.bundle).toEqual(original)
})

test('OBJ converted image budget includes distinct recipes before any pixels: exactly 32 MiB succeeds and the ninth raster-sized bake fails', () => {
  const materials = Array.from({ length: 9 }, (_, i) => ({
      name: `M${i}`,
      body: `Kd ${(i + 1) / 10} 1 1\nmap_Kd image.png`,
    })),
    image = encodePng(new Uint8Array(1024 * 1024 * 4), 1024, 1024),
    f = fixture(materials, [{ path: 'image.png', bytes: image }]),
    raster = f.decoded.rasters[0]!,
    original = raster.rgba
  Object.defineProperty(raster, 'rgba', {
    get() {
      throw new Error('Read before complete image budget')
    },
  })
  fails(() => f.convert(), 'budget', 'files["m/a.mtl"].lines[27]')
  expect(original.byteLength).toBe(4 * 1024 * 1024)
  const exact = fixture(materials.slice(0, 8), [{ path: 'image.png', bytes: image }]).convert()
  expect(exact.pixelBytes).toBe(SCENE_LIMITS.pixelBytes)
  expect(exact.images).toHaveLength(8)
  expect(exact.images.every((image) => image.layers[0]!.pixels!.length === 1024 * 1024 * 4)).toBe(
    true,
  )
})

test('OBJ native image count is budgeted by distinct recipes, allowing exactly 20,000 and rejecting one extra before pixels', () => {
  const materials = Array.from({ length: SCENE_LIMITS.images + 1 }, (_, i) => ({
      name: `M${i}`,
      body: `Kd 0 ${i / SCENE_LIMITS.images} 0\nmap_Kd image.png`,
    })),
    image = { path: 'image.png', bytes: encodePng(Uint8Array.of(0, 0, 0, 255), 1, 1) },
    tooMany = fixture(materials, [image])
  Object.defineProperty(tooMany.decoded.rasters[0]!, 'rgba', {
    get() {
      throw new Error('Read before complete image count')
    },
  })
  fails(() => tooMany.convert(), 'budget', `files["m/a.mtl"].lines[${3 * materials.length}]`)
  const exact = fixture(materials.slice(0, SCENE_LIMITS.images), [image]).convert()
  expect(exact.images).toHaveLength(SCENE_LIMITS.images)
  expect(exact.pixelBytes).toBe(SCENE_LIMITS.images * 4)
  expect(new Set(exact.materials.map((material) => material.colorImageId)).size).toBe(
    SCENE_LIMITS.images,
  )
})

test('OBJ sixteen-bit normals preserve linear RGB before quantization; a no-UV sibling retains solid factors and never gains image bindings', () => {
  const image = makePngFixture({
      width: 1,
      height: 1,
      depth: 16,
      colorType: 6,
      samples: [12345, 32768, 65535, 0],
    }).bytes,
    f = fixture(
      [
        {
          name: 'A',
          body: 'Kd .2 .3 .4\nd .5\nPm .25\nnorm image.png\nmap_Pm -imfchan r image.png',
        },
      ],
      [{ path: 'image.png', bytes: image }],
      appearanceOptions,
      `usemtl A\n${face}f 1 2 3\n`,
    ),
    result = f.convert(),
    [mapped, plain] = result.materials
  expect(result.materials).toHaveLength(2)
  expect(pixels(result, mapped!.normalImageId)).toEqual(
    Uint8Array.of(Math.round(12345 / 257), 128, 255, 255),
  )
  expect(mapped!.normalFlipY).toBe(false)
  expect(mapped!.normalStrength).toBe(1)
  expect(plain).toMatchObject({
    baseColor: { value: [toSrgb(0.2), toSrgb(0.3), toSrgb(0.4), 0.5] },
    metalness: 0.25,
  })
  expect(plain!.normalImageId).toBeUndefined()
  expect(plain!.metalnessImageId).toBeUndefined()
  expect(result.issues.filter((issue) => issue.code === 'rgba16-to-rgba8')).toHaveLength(2)
  validate(result)
  expect(readSceneDocument(native(f, result))).toMatchObject({ status: 'valid' })
})

test('OBJ conversion validates strict policies and material count before opening selected source; missing decoded data is contextual', () => {
  const f = fixture([{ name: 'A', body: 'map_Kd image.png' }], [{ path: 'image.png', bytes: png }]),
    unread = {
      ...f.bundle,
      get libraries(): typeof f.bundle.libraries {
        throw new Error('Source opened')
      },
    }
  for (const [key, value] of [
    ['colorAlpha', null],
    ['normalY', 'automatic'],
    ['doubleSided', 1],
    ['opacitySampling', null],
    ['extra', true],
  ]) {
    const invalid = { ...policy, [String(key)]: value }
    // Public runtime boundary receives unknown JSON in the eventual worker.
    fails(
      () =>
        convertObjMaterials(
          unread,
          f.appearance,
          f.decoded,
          invalid as ObjMaterialConversionOptions,
        ),
      'invalid',
      `options.${key}`,
    )
  }
  fails(
    () =>
      convertObjMaterials(
        unread,
        { ...f.appearance, materials: new Array(SCENE_LIMITS.materials + 1) },
        f.decoded,
        policy,
      ),
    'budget',
    'materials',
  )
  f.decoded.images.clear()
  fails(() => f.convert(), 'invalid', 'files["m/a.mtl"].lines[2]')
})

test('OBJ normal convention preserves upward tangent handedness, including negative map scale, with native materials and GLB validation', async () => {
  for (const scale of [
    [1, 1],
    [-2, 3],
    [2, -3],
    [-2, -3],
  ])
    for (const normalY of ['positive', 'negative'] as const) {
      const f = fixture(
          [
            {
              name: 'Relevo',
              body: `map_Kd -s ${scale.join(' ')} color.png\nbump -bm 2 -s ${scale.join(' ')} normal.png\nmap_Pr -imfchan g -s ${scale.join(' ')} normal.png\nmap_Pm -imfchan b -s ${scale.join(' ')} normal.png`,
            },
          ],
          [
            { path: 'color.png', bytes: png },
            { path: 'normal.png', bytes: encodePng(Uint8Array.of(90, 170, 240, 0), 1, 1) },
          ],
          { ...appearanceOptions, textures: { ...appearanceOptions.textures, bump: 'normal' } },
        ),
        result = f.convert({ ...policy, normalY }),
        document = native(f, result),
        resource = new SceneRenderResource(),
        geometries: BufferGeometry[] = []
      const mesh = document.geometries[0]!
      if (mesh.kind !== 'mesh') throw new Error('Native OBJ mesh expected')
      const uv = Object.values(mesh.faces)[0]!.corners.flatMap((corner) => corner.uv)
      try {
        resource.update(document)
        let found = false
        resource.root.traverse((object) => {
          if (!(object instanceof Mesh)) return
          for (const gpu of Array.isArray(object.material) ? object.material : [object.material]) {
            if (gpu.name !== 'Relevo') continue
            found = true
            expect(gpu.map instanceof DataTexture).toBe(true)
            expect(gpu.map.colorSpace).toBe(SRGBColorSpace)
            expect(gpu.normalMap.colorSpace).toBe(NoColorSpace)
            expect(gpu.roughnessMap.colorSpace).toBe(NoColorSpace)
            expect(gpu.metalnessMap.colorSpace).toBe(NoColorSpace)
            expect(gpu.normalMap.flipY).toBe(false)
            expect(gpu.normalMap.image.data).toEqual(Uint8Array.of(90, 170, 240, 255))
            expect(gpu.normalScale.toArray()).toEqual([2, normalY === 'positive' ? 2 : -2])
            expect(gpu.roughness).toBe(1)
            expect(gpu.metalness).toBe(1)
            const basis = (coords: number[], ySign: number) => {
                const g = new BufferGeometry()
                geometries.push(g)
                g.setIndex([0, 1, 2])
                g.setAttribute(
                  'position',
                  new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3),
                )
                g.setAttribute('normal', new Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3))
                g.setAttribute('uv', new Float32BufferAttribute(coords, 2))
                g.computeTangents()
                const tangent = g.getAttribute('tangent'),
                  t = new Vector3().fromBufferAttribute(tangent, 0),
                  n = new Vector3(0, 0, 1),
                  b = n.clone().cross(t).multiplyScalar(tangent.getW(0))
                return t
                  .multiplyScalar(((90 / 255) * 2 - 1) * 2)
                  .add(b.multiplyScalar(((170 / 255) * 2 - 1) * 2 * ySign))
                  .add(n.multiplyScalar((240 / 255) * 2 - 1))
                  .normalize()
              },
              source = basis([0, 0, scale[0]!, 0, 0, scale[1]!], normalY === 'positive' ? 1 : -1),
              converted = basis(uv, gpu.normalScale.y / 2)
            expect(source.distanceTo(converted)).toBeLessThan(1e-14)
          }
        })
        expect(found).toBe(true)
        validate(result)
        expect(readSceneDocument(document)).toMatchObject({ status: 'valid' })
        if (scale[0] === 1 && normalY === 'positive') {
          const exported = encodeSceneGlb(document, { allowLosses: true }).bytes
          await expectValidGlb(exported, ['MESH_PRIMITIVE_GENERATED_TANGENT_SPACE'])
          const read = readGltfDocument(exported)
          if (read.status !== 'ready') throw new Error('Self-contained export expected')
          const appearance = read.document.appearance,
            material = appearance.materials.find((material) => material.name === 'Relevo')!,
            index = appearance.textures[material.normalTexture!.index]!.source!,
            raster = decodeGltfRasters(read.document.resources.images, [index]).rasters[0]!
          // GLB reflects V: its green channel compensates the changed bitangent.
          expect(raster.rgba).toEqual(Uint8Array.of(90, 85, 240, 255))
        }
      } finally {
        for (const geometry of geometries) geometry.dispose()
        resource.dispose()
      }
    }
})
