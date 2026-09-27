import { bytesToBase64 } from '../core/skinCodec'
import { encodeSceneGlb } from '../export/sceneGlb'
import { sceneGlbFlipbookContract, sceneGlbFlipbookTransform } from '../export/sceneGlbFlipbook'
import type { MoldaSceneDocument, SceneImage } from '../scene/document'
import { readSceneDocument } from '../scene/readDocument'
import { makeSceneGlbFixture } from './sceneGlbFixture'

const COLUMNS = 2
const ROWS = 2
const FRAME = 2
/** One flat colour per cell so a sampled pixel names its cell without interpolation guesses. */
const CELL_COLORS: ReadonlyArray<readonly [number, number, number]> = [
  [255, 0, 0],
  [0, 255, 0],
  [0, 0, 255],
  [255, 255, 0],
]

function flipbookSheet(): SceneImage {
  const width = COLUMNS * FRAME,
    height = ROWS * FRAME
  const pixels = new Uint8Array(width * height * 4)
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      // Authoring rows are bottom-up; sheet cells are numbered from the visible top-left.
      const cell = Math.floor((height - 1 - y) / FRAME) * COLUMNS + Math.floor(x / FRAME)
      const color = CELL_COLORS[cell]!
      const i = (y * width + x) * 4
      pixels[i] = color[0]
      pixels[i + 1] = color[1]
      pixels[i + 2] = color[2]
      pixels[i + 3] = 255
    }
  return {
    id: 'paint',
    name: 'Pintura que se mexe',
    width,
    height,
    encoding: 'rgba',
    layers: [{ id: 'layer', name: 'Camada', visible: true, opacity: 1, pixels }],
    // Out of order and with a repeat: a step is not a cell, and the contract must keep both.
    flipbook: { frameWidth: FRAME, frameHeight: FRAME, frames: [1, 3, 0, 3], fps: 8, loop: true },
  }
}

/** Portable contract data for Studio. No Studio imports; pixels come from the native document. */
export function makeSceneStudioFlipbookContract() {
  const source: MoldaSceneDocument = makeSceneGlbFixture(1, 1, 3, 0)
  source.id = 'molda-studio-flipbook-contract'
  source.name = 'Pintura animada'
  source.animations = []
  source.images = [flipbookSheet()]
  source.materials[0]!.colorImageId = 'paint'
  const read = readSceneDocument(source)
  if (read.status !== 'valid') throw new Error('Fixture nativa inválida')
  const contract = sceneGlbFlipbookContract(read.document.images[0]!)
  if (!contract) throw new Error('Fixture sem pintura animada')
  const result = encodeSceneGlb(read.document, { animatedPaint: true })
  return {
    producer: 'Molda animated paint GLB, evolution lot 225',
    dataUrl: `data:model/gltf-binary;base64,${bytesToBase64(result.bytes)}`,
    stats: result.stats,
    materialName: source.materials[0]!.name,
    sheet: { width: COLUMNS * FRAME, height: ROWS * FRAME },
    flipbook: contract,
    /** One entry per sequence step: what the consumer must place and what must show up. */
    steps: contract.frames.map((frame, step) => ({
      step,
      frame,
      seconds: step / contract.fps,
      ...sceneGlbFlipbookTransform(contract, frame),
      rgba: [...CELL_COLORS[frame]!, 255],
    })),
  }
}
