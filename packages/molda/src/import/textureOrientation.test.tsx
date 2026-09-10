import { expect, spyOn, test } from 'bun:test'
import { render } from '@testing-library/react'
import sharp from 'sharp'
import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three'
import { SceneImagePreview } from '../components/editor/scene/SceneImagePreview'
import { GlbBinary } from '../export/GlbBinary'
import { encodeGlbContainer } from '../export/glbContainer'
import { encodePng } from '../export/png'
import { encodeSceneGlb } from '../export/sceneGlb'
import type { MoldaSceneDocument, SceneImage, Vec2 } from '../scene/document'
import { sceneImageTexel } from '../scene/imageCoordinates'
import { readSceneDocument } from '../scene/readDocument'
import { readAccessor, readGlb, readImage } from '../testing/glbRead'
import { expectValidGlb } from '../testing/gltfValidation'
import { readGltfDocument } from './gltfDocument'
import { convertGltfDocument } from './gltfNativeDocument'
import { importDocumentBase } from './importDocumentBase'
import { readObjBundle } from './objBundle'
import { convertObjDocument } from './objNativeDocument'

const identity = { id: 'orientation-import', name: 'Orientação', createdAt: 1, updatedAt: 2 }
const text = (value: string) => new TextEncoder().encode(value)
const topDown = Uint8Array.of(255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 0, 255)
const bottomUp = Uint8Array.of(0, 0, 255, 255, 255, 255, 0, 255, 255, 0, 0, 255, 0, 255, 0, 255)
const png = encodePng(topDown, 2, 2)
const normalTopDown = Uint8Array.of(
  90,
  170,
  240,
  255,
  130,
  210,
  200,
  255,
  80,
  60,
  250,
  255,
  230,
  40,
  240,
  255,
)
const sourceUvs: Vec2[] = [
  [0.25, 0.25],
  [0.75, 0.25],
  [0.25, 0.75],
]
const nativeUvs: Vec2[] = [
  [0.25, 0.75],
  [0.75, 0.75],
  [0.25, 0.25],
]

function sourceGlb(normal = false) {
  const binary = new GlbBinary()
  const POSITION = binary.floats(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), 'VEC3', true, 34962)
  const TEXCOORD_0 = binary.floats(new Float32Array(sourceUvs.flat()), 'VEC2', false, 34962)
  const imageView = binary.addView(png)
  const normalView = normal ? binary.addView(encodePng(normalTopDown, 2, 2)) : null
  return encodeGlbContainer(
    {
      asset: { version: '2.0' },
      buffers: [{ byteLength: binary.byteLength }],
      bufferViews: binary.views,
      accessors: binary.accessors,
      images: [
        { bufferView: imageView, mimeType: 'image/png' },
        ...(normal ? [{ bufferView: normalView, mimeType: 'image/png' }] : []),
      ],
      textures: [{ source: 0, sampler: 0 }, ...(normal ? [{ source: 1, sampler: 0 }] : [])],
      samplers: [{ magFilter: 9728, minFilter: 9728, wrapS: 33071, wrapT: 33071 }],
      materials: [
        {
          pbrMetallicRoughness: { baseColorTexture: { index: 0 } },
          ...(normal ? { normalTexture: { index: 1, scale: 1.7 } } : {}),
        },
      ],
      meshes: [{ primitives: [{ attributes: { POSITION, TEXCOORD_0 }, material: 0 }] }],
      nodes: [{ mesh: 0 }],
      scenes: [{ nodes: [0] }],
      scene: 0,
    },
    binary.segments,
  )
}
function importGlb(bytes: Uint8Array) {
  const parsed = readGltfDocument(bytes)
  if (parsed.status !== 'ready') throw new Error('Self-contained fixture expected')
  return convertGltfDocument(parsed.document, 0, identity).document
}
function importObj() {
  const bundle = readObjBundle(
    text(
      'mtllib material.mtl\nv 0 0 0\nv 1 0 0\nv 0 1 0\nvt .25 .75\nvt .75 .75\nvt .25 .25\nusemtl Paint\nf 1/1 2/2 3/3\n',
    ),
    [
      { path: 'material.mtl', bytes: text('newmtl Paint\nKd 1 1 1\nmap_Kd image.png\n') },
      { path: 'image.png', bytes: png },
    ],
  )
  if (bundle.status !== 'ready') throw new Error('Self-contained fixture expected')
  return convertObjDocument(bundle, identity, {
    appearance: {
      base: { rgbSpace: 'linear' },
      textures: { colorSpace: 'srgb', scalarSpace: 'linear' },
    },
    images: { colorAlpha: 'multiply', normalY: 'positive', doubleSided: false },
  }).document
}
function imageOf(document: MoldaSceneDocument) {
  const id = document.materials.find((material) => material.colorImageId)?.colorImageId
  const image = document.images.find((image) => image.id === id)
  if (!image) throw new Error('Color image expected')
  return image
}
function uvsOf(document: MoldaSceneDocument) {
  const geometry = document.geometries[0]!
  if (geometry.kind !== 'mesh') throw new Error('Mesh expected')
  return Object.values(geometry.faces)[0]!.corners.map((corner) => corner.uv)
}
function previewPixels(image: SceneImage) {
  let last = new Uint8ClampedArray()
  const context = {
    createImageData: (width: number, height: number) => ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
    }),
    putImageData: (data: ImageData) => {
      last = data.data.slice()
    },
  }
  const boundary = spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    (() => context) as unknown as HTMLCanvasElement['getContext'],
  )
  let view: ReturnType<typeof render> | undefined
  try {
    view = render(<SceneImagePreview image={image} palette={[]} base={[0, 0, 0, 0]} />)
    return new Uint8Array(last)
  } finally {
    view?.unmount()
    boundary.mockRestore()
  }
}
function nativeDocument(): MoldaSceneDocument {
  return {
    ...importDocumentBase(identity),
    nodes: [
      {
        id: 'part',
        name: 'Peça',
        kind: 'mesh',
        parentId: null,
        geometryId: 'geometry',
        materialId: 'paint',
        hidden: false,
        locked: false,
        transform: {
          kind: 'trs',
          translation: [0, 0, 0],
          rotation: [0, 0, 0, 1],
          scale: [1, 1, 1],
        },
      },
    ],
    geometries: [
      {
        id: 'geometry',
        kind: 'mesh',
        vertices: { a: [0, 0, 0], b: [1, 0, 0], c: [0, 1, 0] },
        faces: {
          face: {
            corners: ['a', 'b', 'c'].map((vertexId, i) => ({ vertexId, uv: [...nativeUvs[i]!] })),
          },
        },
        looseEdges: [],
      },
    ],
    materials: [
      {
        id: 'paint',
        name: 'Pintura',
        baseColor: { kind: 'rgba', value: [0, 0, 0, 0] },
        colorImageId: 'image',
        roughness: 1,
        metalness: 0,
        doubleSided: false,
      },
    ],
    images: [
      {
        id: 'image',
        name: 'Imagem',
        width: 2,
        height: 2,
        encoding: 'rgba',
        layers: [
          { id: 'layer', name: 'Camada', visible: true, opacity: 1, pixels: bottomUp.slice() },
        ],
      },
    ],
  }
}

for (const [format, convert] of [
  ['glTF', () => importGlb(sourceGlb())],
  ['OBJ', importObj],
] as const) {
  test(`${format} import shows the original upright bitmap in the real native 2D preview`, () => {
    const document = convert()
    expect(previewPixels(imageOf(document))).toEqual(topDown)
    expect(imageOf(document).layers[0]!.pixels).toEqual(bottomUp)
  })
  test(`${format} import converts UV with image rows while preserving 3D samples at pixel centers`, () => {
    const document = convert()
    const image = imageOf(document),
      uvs = uvsOf(document)
    expect(uvs).toEqual(nativeUvs)
    for (const [i, uv] of uvs.entries()) {
      const [x, y] = sceneImageTexel(image, uv)!
      expect([...image.layers[0]!.pixels.subarray((y * 2 + x) * 4, (y * 2 + x + 1) * 4)]).toEqual([
        ...topDown.subarray(i * 4, i * 4 + 4),
      ])
    }
  })
}

test('native GLB export keeps the visible image upright and reflects UV together, checked by independent image/container readers', async () => {
  const document = nativeDocument(),
    before = structuredClone(document)
  expect(readSceneDocument(document).status).toBe('valid')
  expect(previewPixels(imageOf(document))).toEqual(topDown)
  const bytes = encodeSceneGlb(document, { allowLosses: true }).bytes
  await expectValidGlb(bytes)
  const parsed = readGlb(bytes)
  const decoded = await sharp(Buffer.from(readImage(parsed, 0)))
    .ensureAlpha()
    .raw()
    .toBuffer()
  expect(new Uint8Array(decoded)).toEqual(topDown)
  const mesh = (
    parsed.json.meshes as Array<{ primitives: Array<{ attributes: { TEXCOORD_0: number } }> }>
  )[0]!
  expect([...readAccessor(parsed, mesh.primitives[0]!.attributes.TEXCOORD_0)]).toEqual(
    sourceUvs.flat(),
  )
  expect(document).toEqual(before)
})

test('native image orientation and authorial UV remain stable across repeated complete GLB roundtrips', () => {
  let document = nativeDocument()
  const original = structuredClone(document)
  for (let turn = 0; turn < 3; turn++) {
    document = importGlb(encodeSceneGlb(document, { allowLosses: true }).bytes)
    expect(previewPixels(imageOf(document))).toEqual(topDown)
    expect(imageOf(document).layers[0]!.pixels).toEqual(bottomUp)
    expect(uvsOf(document)).toEqual(nativeUvs)
  }
  expect(original.images[0]!.layers[0]!.pixels).toEqual(bottomUp)
})

// Independent tangent-space oracle: row zero is sampled using the UV convention
// of the supplied bitmap, without importing any production conversion helper.
function normalVectors(uvs: Vec2[], pixels: Uint8Array, strength: number, ySign: number) {
  const geometry = new BufferGeometry()
  try {
    geometry.setIndex([0, 1, 2])
    geometry.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3))
    geometry.setAttribute('normal', new Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3))
    geometry.setAttribute('uv', new Float32BufferAttribute(uvs.flat(), 2))
    geometry.computeTangents()
    const tangent = geometry.getAttribute('tangent')
    return uvs.map(([u, v], i) => {
      const offset = (Math.floor(v * 2) * 2 + Math.floor(u * 2)) * 4,
        t = new Vector3().fromBufferAttribute(tangent, i),
        n = new Vector3(0, 0, 1),
        b = n.clone().cross(t).multiplyScalar(tangent.getW(i))
      return t
        .multiplyScalar(((pixels[offset]! / 255) * 2 - 1) * strength)
        .add(b.multiplyScalar(((pixels[offset + 1]! / 255) * 2 - 1) * strength * ySign))
        .add(n.multiplyScalar((pixels[offset + 2]! / 255) * 2 - 1))
        .normalize()
    })
  } finally {
    geometry.dispose()
  }
}
function nativeNormals(document: MoldaSceneDocument) {
  const material = document.materials.find((material) => material.normalImageId)!,
    image = document.images.find((image) => image.id === material.normalImageId)!
  return normalVectors(
    uvsOf(document),
    image.layers[0]!.pixels,
    material.normalStrength ?? 1,
    material.normalFlipY ? -1 : 1,
  )
}
async function verifyNormalRoundtrips(initial: MoldaSceneDocument, expected: Vector3[]) {
  let document = initial
  for (let turn = 0; turn < 3; turn++) {
    const before = structuredClone(document)
    for (const [i, vector] of nativeNormals(document).entries())
      expect(vector.distanceTo(expected[i]!)).toBeLessThan(1e-14)
    const bytes = encodeSceneGlb(document, { allowLosses: true }).bytes
    await expectValidGlb(bytes, ['MESH_PRIMITIVE_GENERATED_TANGENT_SPACE'])
    const parsed = readGlb(bytes),
      material = (
        parsed.json.materials as Array<{ normalTexture?: { index: number; scale: number } }>
      ).find((material) => material.normalTexture)!,
      texture = (parsed.json.textures as Array<{ source: number }>)[material.normalTexture!.index]!,
      decoded = new Uint8Array(
        await sharp(Buffer.from(readImage(parsed, texture.source)))
          .ensureAlpha()
          .raw()
          .toBuffer(),
      ),
      mesh = (
        parsed.json.meshes as Array<{ primitives: Array<{ attributes: { TEXCOORD_0: number } }> }>
      )[0]!,
      coords = readAccessor(parsed, mesh.primitives[0]!.attributes.TEXCOORD_0),
      uvs: Vec2[] = [0, 2, 4].map((i) => [coords[i]!, coords[i + 1]!])
    for (const [i, vector] of normalVectors(
      uvs,
      decoded,
      material.normalTexture!.scale,
      1,
    ).entries())
      expect(vector.distanceTo(expected[i]!)).toBeLessThan(1e-14)
    expect(document).toEqual(before)
    document = importGlb(bytes)
  }
  for (const [i, vector] of nativeNormals(document).entries())
    expect(vector.distanceTo(expected[i]!)).toBeLessThan(1e-14)
}

test('glTF normal orientation survives native conversion and three export/reimports against independent tangent bases', async () => {
  const document = importGlb(sourceGlb(true))
  expect(document.materials.find((material) => material.normalImageId)!.normalFlipY).toBe(true)
  await verifyNormalRoundtrips(document, normalVectors(sourceUvs, normalTopDown, 1.7, 1))
})

test('both native normal Y conventions preserve physical lighting through GLB row/UV reflection', async () => {
  for (const normalFlipY of [false, true]) {
    const document = nativeDocument(),
      pixels = Uint8Array.of(...normalTopDown.subarray(8), ...normalTopDown.subarray(0, 8))
    Object.assign(document.materials[0]!, {
      normalImageId: 'normal',
      normalStrength: 1.7,
      normalFlipY,
    })
    document.images.push({
      id: 'normal',
      name: 'Normal',
      width: 2,
      height: 2,
      encoding: 'rgba',
      layers: [{ id: 'normal-layer', name: 'Normal', visible: true, opacity: 1, pixels }],
    })
    expect(readSceneDocument(document).status).toBe('valid')
    await verifyNormalRoundtrips(
      document,
      normalVectors(nativeUvs, pixels, 1.7, normalFlipY ? -1 : 1),
    )
  }
})
