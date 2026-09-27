import { cpus } from 'node:os'
import { GlbBinary } from '../src/export/GlbBinary'
import { encodeGlbContainer } from '../src/export/glbContainer'
import { encodePng } from '../src/export/png'
import { readGltfDocument } from '../src/import/gltfDocument'
import { convertGltfMaterials, type GltfNativeMaterials } from '../src/import/gltfNativeMaterials'
import { decodeGltfRasters } from '../src/import/gltfRasters'
import { selectGltfDocument } from '../src/import/gltfSelection'

// Captured before lookup-table optimization, when native imports still used top-down rows.
// L187 checks these SAME goldens after reversing only row order in the hash stream.
// This independently proves that the orientation fix changed no channels or metadata.
const goldens: Record<string, string> = {
  '16:1': 'd4d8506e808ec52412a2502ba5d5989224847028f825c0bdca4c0bb6fe0e2280',
  '256:4': 'a6674a6beaeb71f238d5a8f897ec3d1bc43dee9ac294e6ba120f9e9f3ca615d1',
  '1024:8': '0479216591abf705773d9a2a9da19450a2bdd5615ea87b139c8d28419f7e59c8',
}

function fixture(side: number, variants: number) {
  const binary = new GlbBinary(),
    position = binary.floats(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), 'VEC3', true, 34962),
    uv = binary.floats(new Float32Array([0, 0, 1, 0, 0, 1]), 'VEC2', false, 34962),
    pixels = Uint8Array.from(
      { length: side * side * 4 },
      (_, i) => (i * 31 + Math.floor(i / 7) * 13) % 256,
    ),
    image = binary.addView(encodePng(pixels, side, side)),
    bytes = encodeGlbContainer(
      {
        asset: { version: '2.0' },
        buffers: [{ byteLength: binary.byteLength }],
        bufferViews: binary.views,
        accessors: binary.accessors,
        images: [{ bufferView: image, mimeType: 'image/png', name: 'Teste' }],
        textures: [{ source: 0, sampler: 0 }],
        samplers: [{ magFilter: 9728, minFilter: 9728, wrapS: 33071, wrapT: 33071 }],
        materials: Array.from({ length: variants }, (_, i) => ({
          name: `Cor ${i}`,
          alphaMode: 'BLEND',
          pbrMetallicRoughness: {
            baseColorTexture: { index: 0 },
            baseColorFactor: [(i + 1) / 10, 0.3, 0.7, 0.8],
          },
        })),
        meshes: [
          {
            primitives: Array.from({ length: variants }, (_, i) => ({
              attributes: { POSITION: position, TEXCOORD_0: uv },
              material: i,
            })),
          },
        ],
        nodes: [{ mesh: 0 }],
      },
      binary.segments,
    ),
    read = readGltfDocument(bytes)
  if (read.status !== 'ready') throw new Error('Self-contained fixture expected')
  const source = read.document,
    selection = selectGltfDocument(source, null),
    decoded = decodeGltfRasters(source.resources.images, selection.dependencies.images)
  return { source, selection, decoded }
}
function digest(result: GltfNativeMaterials, legacyTopDown = false) {
  const hash = new Bun.CryptoHasher('sha256')
  hash.update(
    JSON.stringify({
      ...result,
      geometry: {
        ...result.geometry,
        ids: Array.from(result.geometry.ids),
        uvSetByMaterial: Array.from(result.geometry.uvSetByMaterial ?? []),
      },
      images: result.images.map((image) => ({
        ...image,
        layers: image.layers.map((layer) => ({ ...layer, pixels: layer.pixels.length })),
      })),
    }),
  )
  for (const image of result.images)
    for (const layer of image.layers) {
      if (legacyTopDown) {
        const stride = image.width * 4
        for (let row = image.height - 1; row >= 0; row--)
          hash.update(layer.pixels.subarray(row * stride, (row + 1) * stride))
      } else hash.update(layer.pixels)
    }
  return hash.digest('hex')
}
function stats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b),
    at = (q: number) => Number(sorted[Math.ceil(sorted.length * q) - 1]!.toFixed(3))
  return { p50: at(0.5), p95: at(0.95), p99: at(0.99) }
}

// CPU conversion only: excludes IO/decode/setup/hashing/GC. Not browser, GPU or input latency.
console.log(
  JSON.stringify({
    bun: process.versions.bun,
    cpu: cpus()[0]?.model,
    platform: process.platform,
    warmup: 3,
    samples: 10,
  }),
)
for (const [side, variants] of [
  [16, 1],
  [256, 4],
  [1024, 8],
] as const) {
  const f = fixture(side, variants),
    before = structuredClone(f),
    times: number[] = []
  let sha256 = '',
    legacyTopDownSha256 = '',
    sampledRssBytes = 0
  for (let run = 0; run < 13; run++) {
    Bun.gc(true)
    const start = performance.now(),
      result = convertGltfMaterials(f.source, f.selection, f.decoded),
      done = performance.now()
    if (run >= 3) times.push(done - start)
    const hash = digest(result),
      expected = goldens[`${side}:${variants}`]
    legacyTopDownSha256 = digest(result, true)
    if (!expected || legacyTopDownSha256 !== expected || (sha256 && hash !== sha256))
      throw new Error('Golden result changed')
    sha256 = hash
    sampledRssBytes = Math.max(sampledRssBytes, process.memoryUsage().rss)
  }
  if (!Bun.deepEquals(f, before)) throw new Error('Source changed')
  const ms = stats(times)
  console.log(
    JSON.stringify({
      side,
      variants,
      milliseconds: ms,
      megapixelsPerSecondAtP50: Number(((side * side * variants) / (ms.p50 * 1000)).toFixed(3)),
      outputBytes: side * side * variants * 4,
      sampledRssBytes,
      sha256,
      legacyTopDownSha256,
      sourceUnchanged: true,
    }),
  )
}
