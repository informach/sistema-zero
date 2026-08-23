/**
 * Uma animação do sprite → um GIF animado, nos DOIS estilos.
 *
 * É o único export do Pinta que a criança consegue simplesmente MANDAR para
 * alguém e a pessoa ver mexendo: PNG é parado, a folha de quadros só faz sentido
 * dentro do Estúdio, e o `.pinta.json` só abre aqui. O GIF abre em qualquer
 * lugar e anima sozinho.
 *
 * Os dois caminhos são bem diferentes por baixo, e é de propósito:
 *
 * - **Pixel**: o bitmap JÁ é indexado com paleta e índice 0 transparente, que é
 *   exatamente o modelo do GIF. Nada de canvas, nada de perda, e o upscale é
 *   repetição de pixel (nearest-neighbor EXATO, sem interpolação de canvas).
 *   Por tabela, roda no happy-dom e é testável de ponta a ponta.
 * - **Vetorial**: rasteriza a animação em TIRAS limitadas (um `<img>` e um
 *   canvas por bloco), fatia em quadros e reduz as cores (`quantize.ts`). Precisa de
 *   canvas de verdade, então devolve `null` no happy-dom, como o resto do vetor.
 *
 * O tempo de cada quadro sai de `frameDurationsMs`, o MESMO cálculo da prévia:
 * animação com suavização exporta com os quadros das pontas mais demorados, do
 * jeito que a criança viu na tela.
 */
import { frameDurationsMs } from '../animation/player'
import { TRANSPARENT_INDEX } from '../core/palette'
import type {
  PintaBitmap,
  PintaEasing,
  PintaPixelAnimation,
  PintaVectorAnimation,
  PixelSpriteAsset,
  VectorFrame,
  VectorSpriteAsset,
} from '../core/project'
import { resolveAssetPalette } from '../core/project'
import { flattenCelsOrBlank } from '../pixel/layers'
import { hexToRgb } from '../pixel/render'
import { visibleShapes } from '../vector/model'
import { svgToCanvas } from '../vector/rasterize'
import { encodeGif, msToDelayCs } from './gif'
import { quantizeFrames, type Rgb } from './quantize'
import { vectorStripPortableSvg } from './vectorSheet'

/** Máximo de cores do formato (a posição 0 é o slot transparente). */
const GIF_MAX_COLORS = 256
/** Menor teto conhecido entre os devices suportados (Safari/iPad). */
export const VECTOR_GIF_MAX_CANVAS_WIDTH = 4096

export interface VectorGifChunk {
  start: number
  count: number
}

export type VectorGifRasterizer = (
  svg: string,
  width: number,
  height: number,
  scale: number,
) => Promise<{
  getContext(
    contextId: '2d',
  ): { getImageData(x: number, y: number, width: number, height: number): ImageData } | null
} | null>

/** Plano puro; `[]` quando nem um quadro individual cabe no teto do canvas. */
export function vectorGifChunks(
  frameCount: number,
  frameWidth: number,
  scale: number,
  maxCanvasWidth = VECTOR_GIF_MAX_CANVAS_WIDTH,
): VectorGifChunk[] {
  const total = Math.max(0, Math.floor(frameCount))
  if (total === 0) return []
  const outputFrameWidth = Math.max(1, Math.round(frameWidth) * Math.max(1, Math.round(scale)))
  if (outputFrameWidth > maxCanvasWidth) return []
  const perChunk = Math.max(1, Math.floor(Math.max(1, maxCanvasWidth) / outputFrameWidth))
  const chunks: VectorGifChunk[] = []
  for (let start = 0; start < total; start += perChunk) {
    chunks.push({ start, count: Math.min(perChunk, total - start) })
  }
  return chunks
}

/**
 * A paleta do asset como tabela RGB do GIF + quais índices são PINTÁVEIS.
 * Espelha `bitmapToRGBA`: o índice 0 e qualquer entrada vazia ou fora da paleta
 * são transparentes.
 */
function paletteTable(colors: readonly string[]): { rgb: Rgb[]; paintable: boolean[] } {
  const rgb: Rgb[] = []
  const paintable: boolean[] = []
  for (let i = 0; i < Math.min(colors.length, GIF_MAX_COLORS); i += 1) {
    const hex = colors[i]
    const usable = i !== TRANSPARENT_INDEX && Boolean(hex)
    rgb.push(usable ? hexToRgb(hex as string) : [0, 0, 0])
    paintable.push(usable)
  }
  if (rgb.length === 0) {
    rgb.push([0, 0, 0])
    paintable.push(false)
  }
  return { rgb, paintable }
}

/**
 * Copia o bitmap num quadro de `width×height` ampliado por repetição de pixel.
 * Recorta o que passar e deixa transparente o que faltar — quadro com tamanho
 * diferente do sprite (asset antigo, import torto) vira buraco, nunca exceção.
 */
function toGifFrame(
  bitmap: PintaBitmap,
  width: number,
  height: number,
  scale: number,
  paintable: readonly boolean[],
): Uint8Array {
  const out = new Uint8Array(width * scale * height * scale)
  const outWidth = width * scale
  for (let y = 0; y < height; y += 1) {
    if (y >= bitmap.height) break
    for (let x = 0; x < width; x += 1) {
      if (x >= bitmap.width) break
      const index = bitmap.data[y * bitmap.width + x] ?? TRANSPARENT_INDEX
      if (!paintable[index]) continue // já nasce 0 = transparente
      for (let dy = 0; dy < scale; dy += 1) {
        const row = (y * scale + dy) * outWidth + x * scale
        for (let dx = 0; dx < scale; dx += 1) out[row + dx] = index
      }
    }
  }
  return out
}

/** Os tempos da animação já em centésimos de segundo (a unidade do GIF). */
function delaysFor(animation: {
  frames: readonly unknown[]
  fps: number
  // `PintaEasing` e não a união escrita à mão: curva nova no modelo tem que
  // quebrar o typecheck aqui, não sair do GIF em silêncio.
  easing?: PintaEasing
}): number[] {
  return frameDurationsMs(animation.frames.length, animation.fps, animation.easing).map(msToDelayCs)
}

/**
 * GIF de uma animação do sprite de PIXEL. PURO (nenhum canvas) — o índice do
 * desenho vira o índice do GIF, sem passar por RGBA.
 * `null` em animação sem quadros.
 */
export function pixelAnimationGif(
  asset: PixelSpriteAsset,
  animation: PintaPixelAnimation,
  scale = 1,
): Uint8Array | null {
  if (animation.frames.length === 0) return null
  const { rgb, paintable } = paletteTable(resolveAssetPalette(asset))
  const step = Math.max(1, Math.round(scale))
  const delays = delaysFor(animation)
  const frames = animation.frames.map((cels, index) => ({
    indices: toGifFrame(
      flattenCelsOrBlank(cels, asset.layers),
      asset.frameWidth,
      asset.frameHeight,
      step,
      paintable,
    ),
    delayCs: delays[index] ?? msToDelayCs(1000 / Math.max(animation.fps, 1)),
  }))
  return encodeGif({
    width: asset.frameWidth * step,
    height: asset.frameHeight * step,
    palette: rgb,
    frames,
    transparentIndex: TRANSPARENT_INDEX,
    loop: animation.loop,
  })
}

/**
 * GIF de uma animação do sprite VETORIAL. Rasteriza tiras de até 4096 px
 * (poucas decodificações de SVG, nunca uma por quadro) e fatia.
 * `null` sem canvas/Image (happy-dom), em SVG irrenderizável ou sem quadros.
 */
export async function vectorAnimationGif(
  asset: VectorSpriteAsset,
  animation: PintaVectorAnimation,
  scale = 1,
  rasterize: VectorGifRasterizer = svgToCanvas,
): Promise<Uint8Array | null> {
  const count = animation.frames.length
  if (count === 0) return null
  const step = Math.max(1, Math.round(scale))
  const width = asset.frameWidth * step
  const height = asset.frameHeight * step
  const rgba: Uint8ClampedArray[] = []
  const chunks = vectorGifChunks(count, asset.frameWidth, step)
  if (chunks.length === 0) return null
  for (const chunk of chunks) {
    const chunkAnimation: PintaVectorAnimation = {
      ...animation,
      frames: animation.frames.slice(chunk.start, chunk.start + chunk.count),
    }
    const canvas = await rasterize(
      await vectorStripPortableSvg(asset, chunkAnimation),
      chunk.count * asset.frameWidth,
      asset.frameHeight,
      step,
    )
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return null
    try {
      for (let i = 0; i < chunk.count; i += 1) {
        rgba.push(ctx.getImageData(i * width, 0, width, height).data)
      }
    } catch {
      // Canvas manchado/limitado: nunca baixa uma animação pela metade.
      return null
    }
  }

  const quantized = quantizeFrames(rgba, GIF_MAX_COLORS, { width, dither: true })
  if (rasterCameOutBlank(animation.frames, quantized.palette.length)) return null

  const delays = delaysFor(animation)
  return encodeGif({
    width,
    height,
    palette: quantized.palette,
    frames: quantized.frames.map((indices, index) => ({
      indices,
      delayCs: delays[index] ?? msToDelayCs(1000 / Math.max(animation.fps, 1)),
    })),
    transparentIndex: 0,
    loop: animation.loop,
  })
}

/**
 * A rasterização saiu vazia com o desenho NÃO estando vazio?
 *
 * ⚠️ Mesmo dentro do teto conservador, um driver pode devolver tudo transparente
 * **em vez de lançar**. Sem esta pergunta, o caso sairia como um GIF em branco
 * com toast de SUCESSO. Paleta com só o slot transparente = nenhum pixel opaco.
 *
 * Conta só as formas VISÍVEIS: animação com tudo escondido é legitimamente
 * vazia, e recusar ali seria dizer "não consegui" para algo que funcionou.
 */
export function rasterCameOutBlank(frames: readonly VectorFrame[], paletteSize: number): boolean {
  return paletteSize <= 1 && frames.some((frame) => visibleShapes(frame).length > 0)
}

/** Os bytes do GIF como Blob, pronto para `triggerDownload` ou upload. */
export function gifBlob(bytes: Uint8Array): Blob {
  return new Blob([bytes as unknown as BlobPart], { type: 'image/gif' })
}
