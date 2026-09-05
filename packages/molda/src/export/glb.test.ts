import { describe, expect, test } from 'bun:test'
import sharp from 'sharp'
import { MOLDA_LIMITS } from '../core/limits'
import { createModelAsset, createPart, type MoldaModelAsset } from '../core/model'
import { base64ToBytes } from '../core/skinCodec'
import { packAtlas } from '../model/atlas'
import { rasterAtlas } from '../model/atlasRaster'
import { buildModelMesh } from '../model/build'
import { setMirrorX } from '../model/partOps'
import { faceSkinSize } from '../model/shapes'
import { makeModel, paintedSkin } from '../testing/fixtures'
import { GLB_CHUNK_BIN, GLB_CHUNK_JSON, readAccessor, readGlb, readImage } from '../testing/glbRead'
import { decodePng } from '../testing/pngDecode'
import { encodeGlb } from './glb'
import { exportModelGlb } from './modelGlb'
import { crc32, encodePng } from './png'

/** A MESMA assinatura que o Estúdio confere (`isGlbV2` em packages/studio/src/core/project.ts). */
function isGlbV2(bytes: Uint8Array): boolean {
  if (bytes.length < 8) return false
  if (bytes[0] !== 0x67 || bytes[1] !== 0x6c || bytes[2] !== 0x54 || bytes[3] !== 0x46) return false
  return (
    ((bytes[4] as number) |
      ((bytes[5] as number) << 8) |
      ((bytes[6] as number) << 16) |
      ((bytes[7] as number) << 24)) ===
    2
  )
}

describe('PNG próprio', () => {
  test('codifica e o decodificador independente e o sharp leem os mesmos pixels', async () => {
    const width = 6
    const height = 4
    const rgba = new Uint8Array(width * height * 4)
    for (let i = 0; i < width * height; i += 1) {
      rgba[i * 4] = (i * 37) % 256
      rgba[i * 4 + 1] = (i * 91) % 256
      rgba[i * 4 + 2] = (i * 13) % 256
      rgba[i * 4 + 3] = i % 3 === 0 ? 0 : 255
    }
    const png = encodePng(rgba, width, height)
    const ours = decodePng(png)
    expect(ours.width).toBe(width)
    expect(ours.height).toBe(height)
    expect(ours.rgba).toEqual(rgba)
    const theirs = await sharp(Buffer.from(png))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    expect(theirs.info.width).toBe(width)
    expect(theirs.info.height).toBe(height)
    expect(new Uint8Array(theirs.data)).toEqual(rgba)
    // Determinístico.
    expect(encodePng(rgba, width, height)).toEqual(png)
  })

  test('crc32 conhecido', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
  })
})

function worstCase(): MoldaModelAsset {
  const model = { ...createModelAsset({ name: 'pior', starter: false }), texelsPerUnit: 8 as const }
  const parts = []
  for (let i = 0; i < MOLDA_LIMITS.maxParts; i += 1) {
    const x = (i % 16) * 2 - 16
    const z = Math.floor(i / 16) * 2 - 8
    const part = createPart({
      id: `s${i}`,
      name: `s${i}`,
      shape: 'sphere',
      from: [x, 0, z],
      to: [x + 2, 2, z + 2],
      color: 2,
    })
    const size = faceSkinSize(part, 'around', 8)
    if (size)
      part.faces.around = paintedSkin(size.width, size.height, (px, py) => ((px + py) % 15) + 1)
    parts.push(part)
  }
  return { ...model, parts }
}

describe('GLB próprio', () => {
  test('container válido: assinatura do Estúdio, chunks alinhados, 1 malha/1 material/1 textura NEAREST', () => {
    const model = setMirrorX(makeModel(), true)
    const result = exportModelGlb(model)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(isGlbV2(result.bytes)).toBe(true)
    expect(result.dataUrl.startsWith('data:model/gltf-binary;base64,')).toBe(true)
    expect(base64ToBytes(result.dataUrl.slice(result.dataUrl.indexOf(',') + 1))).toEqual(
      result.bytes,
    )
    const parsed = readGlb(result.bytes)
    expect(parsed.totalLength % 4).toBe(0)
    expect(parsed.chunks.map((c) => c.type)).toEqual([GLB_CHUNK_JSON, GLB_CHUNK_BIN])
    for (const chunk of parsed.chunks) expect(chunk.length % 4).toBe(0)
    const json = parsed.json as {
      asset: { version: string }
      meshes: Array<{
        primitives: Array<{ attributes: Record<string, number>; indices: number; material: number }>
      }>
      materials: Array<{
        pbrMetallicRoughness: {
          baseColorTexture: { index: number }
          baseColorFactor: number[]
          metallicFactor: number
          roughnessFactor: number
        }
      }>
      textures: unknown[]
      samplers: Array<{ magFilter: number; minFilter: number; wrapS: number; wrapT: number }>
      images: Array<{ mimeType: string }>
      accessors: Array<{ min?: number[]; max?: number[]; count: number }>
      bufferViews: Array<{ byteOffset?: number; byteLength: number }>
      buffers: Array<{ byteLength: number }>
    }
    expect(json.asset.version).toBe('2.0')
    expect(json.meshes).toHaveLength(1)
    expect(json.meshes[0]?.primitives).toHaveLength(1)
    expect(json.materials).toHaveLength(1)
    expect(json.textures).toHaveLength(1)
    expect(json.samplers[0]).toEqual({
      magFilter: 9728,
      minFilter: 9728,
      wrapS: 33071,
      wrapT: 33071,
    })
    expect(json.materials[0]?.pbrMetallicRoughness.baseColorFactor).toEqual([1, 1, 1, 1])
    expect(json.materials[0]?.pbrMetallicRoughness.metallicFactor).toBe(0)
    expect(json.materials[0]?.pbrMetallicRoughness.roughnessFactor).toBe(1)
    expect(json.images[0]?.mimeType).toBe('image/png')
    for (const view of json.bufferViews) expect((view.byteOffset ?? 0) % 4).toBe(0)
    expect(json.buffers[0]?.byteLength).toBe(parsed.bin.length)

    const positions = readAccessor(parsed, 0) as Float32Array
    const normals = readAccessor(parsed, 1) as Float32Array
    const uvs = readAccessor(parsed, 2) as Float32Array
    const indices = readAccessor(parsed, 3)
    const vertexCount = json.accessors[0]?.count ?? 0
    expect(positions.length).toBe(vertexCount * 3)
    expect(normals.length).toBe(vertexCount * 3)
    expect(uvs.length).toBe(vertexCount * 2)
    expect(indices.length % 3).toBe(0)
    for (const index of indices) expect(index).toBeLessThan(vertexCount)
    // min/max do POSITION batem com os dados; o modelo está no chão e centrado.
    const min = json.accessors[0]?.min ?? []
    const max = json.accessors[0]?.max ?? []
    let realMinY = Number.POSITIVE_INFINITY
    let realMinX = Number.POSITIVE_INFINITY
    let realMaxX = Number.NEGATIVE_INFINITY
    for (let i = 0; i < positions.length; i += 3) {
      realMinX = Math.min(realMinX, positions[i] as number)
      realMaxX = Math.max(realMaxX, positions[i] as number)
      realMinY = Math.min(realMinY, positions[i + 1] as number)
    }
    expect(min[1]).toBeCloseTo(realMinY, 4)
    expect(realMinY).toBeCloseTo(0, 4)
    expect(min[0]).toBeCloseTo(realMinX, 4)
    expect(max[0]).toBeCloseTo(realMaxX, 4)
    expect(realMinX + realMaxX).toBeCloseTo(0, 3)
    for (let i = 0; i < uvs.length; i += 1) {
      expect(uvs[i] as number).toBeGreaterThanOrEqual(0)
      expect(uvs[i] as number).toBeLessThanOrEqual(1)
    }
    // Gêmeos entram na malha: 3 peças × triângulos.
    expect(result.triangles).toBe(12 + 8 + 8)
    // A imagem é o PNG do atlas, do tamanho do layout.
    const png = decodePng(readImage(parsed, 0))
    expect(png.width).toBe(result.atlasSize)
    expect(png.height).toBe(result.atlasSize)
  })

  test('a malha fundida tem as normais giradas e unitárias', () => {
    const model = makeModel()
    const packed = packAtlas(model)
    if (!packed.ok) throw new Error('atlas-full')
    const mesh = buildModelMesh(model, packed.layout)
    for (let i = 0; i < mesh.normals.length; i += 3) {
      const length = Math.hypot(
        mesh.normals[i] as number,
        mesh.normals[i + 1] as number,
        mesh.normals[i + 2] as number,
      )
      expect(Math.abs(length - 1)).toBeLessThan(1e-4)
    }
    expect(mesh.indices).toBeInstanceOf(Uint16Array)
    expect(mesh.vertexCount).toBe(mesh.triangleCount * 3)
    const png = encodePng(rasterAtlas(model, packed.layout), packed.layout.size, packed.layout.size)
    const bytes = encodeGlb({ name: 'x', mesh, imagePng: png })
    expect(isGlbV2(bytes)).toBe(true)
  })

  test('o pior caso (128 bolas pintadas em texels 8) cabe no teto do Estúdio', () => {
    const result = exportModelGlb(worstCase())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.chars).toBeLessThanOrEqual(MOLDA_LIMITS.studioMax3DChars)
    expect(result.triangles).toBe(128 * 120)
    expect(result.atlasSize).toBeLessThanOrEqual(512)
  })

  test('modelo vazio e atlas cheio são recusados com o motivo', () => {
    expect(exportModelGlb(createModelAsset({ name: 'x', starter: false }))).toEqual({
      ok: false,
      reason: 'empty',
    })
    const model = { ...createModelAsset({ name: 'x', starter: false }), texelsPerUnit: 8 as const }
    const parts = []
    for (let i = 0; i < MOLDA_LIMITS.maxParts; i += 1) {
      const part = createPart({
        id: `b${i}`,
        name: `b${i}`,
        from: [0, 0, 0],
        to: [32, 32, 32],
        color: 2,
      })
      part.faces = {
        py: paintedSkin(32, 32, () => 2),
        px: paintedSkin(32, 32, () => 2),
        pz: paintedSkin(32, 32, () => 2),
      }
      parts.push(part)
    }
    expect(exportModelGlb({ ...model, parts })).toEqual({ ok: false, reason: 'atlas-full' })
  })
})
