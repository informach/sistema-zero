import { expect, test } from 'bun:test'
import sharp from 'sharp'
import { Mesh, MeshStandardMaterial } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import type { MoldaSceneDocument, SceneImage } from '../scene/document'
import { readSceneDocument } from '../scene/readDocument'
import { readGlb, readImage } from '../testing/glbRead'
import { expectValidGlb } from '../testing/gltfValidation'
import { makeSceneGlbFixture } from '../testing/sceneGlbFixture'
import { makeSceneStudioFlipbookContract } from '../testing/sceneStudioFlipbookContract'
import { encodeSceneGlb } from './sceneGlb'
import {
  SCENE_GLB_FLIPBOOK_CONTRACT,
  type SceneGlbFlipbookContract,
  sceneGlbFlipbookContract,
  sceneGlbFlipbookTransform,
} from './sceneGlbFlipbook'
import { SceneGlbLossError } from './sceneGlbReport'
import { inspectSceneStudioCompatibility } from './sceneStudioCompatibility'

function sheet(
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
    layers: [{ id: 'layer', name: 'Camada', visible: true, opacity: 1, pixels }],
  }
}

/** 2x2 grid of 1px cells; authoring row 0 is the bottom one, so cells 0 and 1 sit at y = 1. */
function quadSheet(id = 'paint'): SceneImage {
  return sheet(id, 2, 2, (x, y) => (y === 1 ? [x * 255, 0, 0, 255] : [0, x * 255, 255, 255]))
}

function fixture(image: SceneImage, frames: number[]): MoldaSceneDocument {
  const source = makeSceneGlbFixture(1, 1, 3, 0)
  source.animations = []
  source.images = [
    { ...image, flipbook: { frameWidth: 1, frameHeight: 1, frames, fps: 4, loop: true } },
  ]
  source.materials[0]!.colorImageId = image.id
  const read = readSceneDocument(source)
  if (read.status !== 'valid') throw new Error('fixture inválida')
  return read.document
}

async function png(bytes: Uint8Array, index: number) {
  const decoded = await sharp(Buffer.from(readImage(readGlb(bytes), index)))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  return { ...decoded.info, rgba: new Uint8Array(decoded.data) }
}

interface GlbJson {
  extensionsUsed?: string[]
  extensionsRequired?: string[]
  materials?: Array<{
    alphaMode: string
    extras?: { molda?: { flipbook?: unknown } }
    pbrMetallicRoughness: {
      baseColorTexture?: { index: number; extensions?: Record<string, unknown> }
    }
  }>
}
function json(bytes: Uint8Array): GlbJson {
  return readGlb(bytes).json as GlbJson
}

test('sem a opção o GLB portátil não muda: primeiro quadro, aviso de perda e nenhuma extensão', async () => {
  const source = fixture(quadSheet(), [1, 3])
  expect(() => encodeSceneGlb(source)).toThrow(SceneGlbLossError)
  const portable = encodeSceneGlb(source, { allowLosses: true })
  expect(portable.issues).toEqual([{ code: 'flipbook-first-frame', sourceId: 'paint' }])
  const parsed = json(portable.bytes)
  expect(parsed.extensionsUsed).toBeUndefined()
  expect(parsed.materials?.[0]?.extras).toBeUndefined()
  expect(parsed.materials?.[0]?.pbrMetallicRoughness.baseColorTexture?.extensions).toBeUndefined()
  const frame = await png(portable.bytes, 0)
  expect([frame.width, frame.height]).toEqual([1, 1])
  // Cell 1 is the visible top-right, which authoring keeps at row y = 1.
  expect(frame.rgba).toEqual(Uint8Array.from([255, 0, 0, 255]))
})

test('documento sem pintura animada sai idêntico nas duas gravações', () => {
  const plain = fixture(quadSheet(), [0])
  plain.images = [quadSheet()]
  expect(encodeSceneGlb(plain, { animatedPaint: true }).bytes).toEqual(encodeSceneGlb(plain).bytes)
})

test('UVs outside a flipbook cell require review and export a cropped static frame', async () => {
  const source = fixture(quadSheet(), [1, 3])
  const geometry = source.geometries[0]!
  if (geometry.kind !== 'mesh') throw new Error('Expected mesh fixture')
  Object.values(geometry.faces)[0]!.corners[0]!.uv = [-0.25, 1.5]
  expect(() => encodeSceneGlb(source, { animatedPaint: true })).toThrow(SceneGlbLossError)
  const accepted = encodeSceneGlb(source, { animatedPaint: true, allowLosses: true })
  expect(accepted.issues).toContainEqual({ code: 'flipbook-uv-first-frame', sourceId: 'paint' })
  expect(accepted.stats.animatedPaints).toBe(0)
  expect(json(accepted.bytes).extensionsRequired).toBeUndefined()
  const image = await png(accepted.bytes, 0)
  expect([image.width, image.height]).toEqual([1, 1])
  expect(image.rgba).toEqual(Uint8Array.from([255, 0, 0, 255]))
  await expectValidGlb(accepted.bytes)
})

test('a later unsafe mesh prevents an earlier shared material from encoding an unsafe sheet', async () => {
  const source = fixture(quadSheet(), [1, 3])
  const geometry = structuredClone(source.geometries[0]!)
  const node = source.nodes[0]!
  if (geometry.kind !== 'mesh' || node.kind !== 'mesh') throw new Error('Expected mesh')
  geometry.id = 'later-geometry'
  Object.values(geometry.faces)[0]!.corners[0]!.uv = [2, 0]
  source.geometries.push(geometry)
  source.nodes.push({ ...node, id: 'later-node', geometryId: geometry.id })
  const result = encodeSceneGlb(source, { animatedPaint: true, allowLosses: true })
  expect(result.stats.animatedPaints).toBe(0)
  expect(result.stats.renderedParts).toBe(2)
  expect(result.issues).toEqual([{ code: 'flipbook-uv-first-frame', sourceId: 'paint' }])
  expect((await png(result.bytes, 0)).rgba).toEqual(Uint8Array.from([255, 0, 0, 255]))
})

test('com a opção a folha inteira viaja com o contrato versionado e sem perda', async () => {
  const source = fixture(quadSheet(), [1, 3])
  const result = encodeSceneGlb(source, { animatedPaint: true })
  expect(result.issues).toEqual([])
  await expectValidGlb(result.bytes)
  const parsed = json(result.bytes)
  expect(parsed.extensionsUsed).toEqual(['KHR_texture_transform'])
  expect(parsed.extensionsRequired).toEqual(['KHR_texture_transform'])
  expect(parsed.materials?.[0]?.extras?.molda?.flipbook).toEqual({
    contract: SCENE_GLB_FLIPBOOK_CONTRACT,
    sourceId: 'paint',
    columns: 2,
    rows: 2,
    frames: [1, 3],
    fps: 4,
    loop: true,
  })
  // The transform points at the first frame of the SEQUENCE, not at cell zero.
  expect(parsed.materials?.[0]?.pbrMetallicRoughness.baseColorTexture?.extensions).toEqual({
    KHR_texture_transform: { offset: [0.5, 0], scale: [0.5, 0.5] },
  })
  const image = await png(result.bytes, 0)
  expect([image.width, image.height]).toEqual([2, 2])
  // PNG rows are top-down, so the visible top row of the sheet comes first.
  expect(image.rgba).toEqual(
    Uint8Array.from([0, 0, 0, 255, 255, 0, 0, 255, 0, 0, 255, 255, 0, 255, 255, 255]),
  )
})

test('cada passo da sequência mostra a célula que o documento nativo tem, com repetição e fora de ordem', async () => {
  const contract = makeSceneStudioFlipbookContract()
  const bytes = Uint8Array.from(atob(contract.dataUrl.split(',')[1] as string), (c) =>
    c.charCodeAt(0),
  )
  const image = await png(bytes, 0)
  expect([image.width, image.height]).toEqual([contract.sheet.width, contract.sheet.height])
  expect(contract.flipbook.frames).toEqual([1, 3, 0, 3])
  for (const step of contract.steps) {
    // Sample the middle of the placed cell exactly as the runtime would address it.
    const u = step.offset[0] + step.scale[0] / 2
    const v = step.offset[1] + step.scale[1] / 2
    const x = Math.floor(u * image.width)
    const y = Math.floor(v * image.height)
    const i = (y * image.width + x) * 4
    expect([...image.rgba.subarray(i, i + 4)]).toEqual(step.rgba)
  }
  // A repeated step holds the same drawing without collapsing the sequence.
  expect(contract.steps[1]?.rgba).toEqual(contract.steps[3]?.rgba as number[])
  expect(contract.steps.map((step) => step.step)).toEqual([0, 1, 2, 3])
})

test('o GLTFLoader real entrega o contrato em userData, sem parser próprio no consumidor', async () => {
  const source = fixture(quadSheet(), [3, 0])
  const result = encodeSceneGlb(source, { animatedPaint: true })
  const loaded = await new GLTFLoader().parseAsync(result.bytes.slice().buffer, '')
  const found: Mesh[] = []
  loaded.scene.traverse((object) => {
    if (object instanceof Mesh) found.push(object)
  })
  const material = found[0]?.material
  if (!(material instanceof MeshStandardMaterial)) throw new Error('Material esperado')
  const contract = material.userData.molda.flipbook as SceneGlbFlipbookContract
  expect(contract).toEqual({
    contract: SCENE_GLB_FLIPBOOK_CONTRACT,
    sourceId: 'paint',
    columns: 2,
    rows: 2,
    frames: [3, 0],
    fps: 4,
    loop: true,
  })
  // O que o loader faz com a extensão depende de decodificar o PNG, e fora do
  // navegador ele não decodifica (a textura falha em silêncio). Então aqui prova-se
  // o que o JSON declara; `map.offset`/`map.repeat` reais ficam para o gate de browser.
  expect(
    json(result.bytes).materials?.[0]?.pbrMetallicRoughness.baseColorTexture?.extensions,
  ).toEqual({
    KHR_texture_transform: sceneGlbFlipbookTransform(contract, contract.frames[0] as number),
  })
  material.dispose()
  for (const geometry of new Set(found.map((mesh) => mesh.geometry))) geometry.dispose()
})

test('mapa de superfície com quadros continua no primeiro quadro, com o aviso de sempre', () => {
  const source = fixture(quadSheet(), [2])
  source.images.push({
    ...quadSheet('rugosidade'),
    flipbook: { frameWidth: 1, frameHeight: 1, frames: [0, 1], fps: 4, loop: false },
  })
  source.materials[0]!.roughnessImageId = 'rugosidade'
  const result = encodeSceneGlb(source, { animatedPaint: true, allowLosses: true })
  expect(result.issues).toEqual([{ code: 'flipbook-first-frame', sourceId: 'rugosidade' }])
  expect(json(result.bytes).materials?.[0]?.extras?.molda?.flipbook).toBeDefined()
})

test('a folha inteira decide a transparência, não só o primeiro quadro', () => {
  const source = fixture(
    sheet('paint', 2, 1, (x) => (x === 0 ? [255, 0, 0, 255] : [0, 255, 0, 0])),
    [0, 1],
  )
  // A cor base entra como fundo da composição: opaca, nenhum quadro fica transparente.
  source.materials[0]!.baseColor = { kind: 'rgba', value: [0.2, 0.4, 0.8, 0] }
  expect(json(encodeSceneGlb(source, { allowLosses: true }).bytes).materials?.[0]?.alphaMode).toBe(
    'OPAQUE',
  )
  expect(
    json(encodeSceneGlb(source, { animatedPaint: true }).bytes).materials?.[0]?.alphaMode,
  ).toBe('BLEND')
})

test('imagem sem quadros não tem contrato e a fórmula da célula é a mesma dos dois lados', () => {
  expect(sceneGlbFlipbookContract(quadSheet())).toBeNull()
  const grid = { columns: 4, rows: 3 }
  expect(sceneGlbFlipbookTransform(grid, 0)).toEqual({ offset: [0, 0], scale: [0.25, 1 / 3] })
  expect(sceneGlbFlipbookTransform(grid, 6)).toEqual({ offset: [0.5, 1 / 3], scale: [0.25, 1 / 3] })
  expect(sceneGlbFlipbookTransform(grid, 11)).toEqual({
    offset: [0.75, 2 / 3],
    scale: [0.25, 1 / 3],
  })
})

// O painel de destino dizia "esta cópia não contém movimentos" para uma cópia cuja TINTA
// anda, dois parágrafos depois de o próprio destino ter dito o contrário.
test('a pintura animada conta como movimento no relatório de destino', () => {
  const document = fixture(quadSheet(), [3, 1, 2, 1])
  // O portátil declara a perda `flipbook-first-frame`; aqui só interessa o relatório.
  const portable = encodeSceneGlb(document, { allowLosses: true })
  const studio = encodeSceneGlb(document, { animatedPaint: true })
  expect(portable.stats.clips).toBe(0)
  expect(portable.stats.animatedPaints).toBe(0)
  expect(studio.stats.animatedPaints).toBeGreaterThan(0)
  const report = (result: typeof studio) =>
    inspectSceneStudioCompatibility({ stats: result.stats, byteLength: result.bytes.byteLength })
  expect(report(studio).animated).toBe(true)
  // O GLB portátil fica no primeiro quadro: ali "sem movimento" continua sendo verdade.
  expect(report(portable).animated).toBe(false)
})
