/**
 * A cor de UM PIXEL da figura (o desenho de pixel art trazido para dentro do
 * vetor). É o que faz o conta-gotas funcionar em cima de uma imagem: o `src`
 * dela é um PNG inteiro assado no desenho, e o `imageUvAt` (puro) já diz ONDE o
 * dedo caiu; aqui só falta abrir a imagem e ler o pixel.
 *
 * ⭐ **A leitura é SÍNCRONA de propósito.** No modo de captura da janelinha do
 * degradê o `pointerdown` é cancelado para segurar o foco (o Degradê reabre e
 * foca o card no microtask; o `mousedown` de compatibilidade viria depois e
 * jogaria o foco no body). Um `await` no meio do toque quebraria essa
 * coreografia — por isso quem usa o conta-gotas PRÉ-CARREGA as figuras
 * (`primeImageSources`) quando a ferramenta liga, e o toque só lê do cache.
 *
 * ⚠️ Nunca `fetch('data:')` — o `connect-src` da CSP do kids bloqueia. A
 * conversão é `dataUrlToBlob` (atob), a mesma do resto do pacote.
 *
 * ⚠️ Ambiente sem canvas devolve `'failed'` em vez de quebrar, como todo
 * caminho de raster deste pacote. Cuidado MEDIDO em happy-dom: o
 * `getContext('2d')` é `null` (regra nº2 do CLAUDE.md), mas o
 * `createImageBitmap` EXISTE e LANÇA `TypeError` com um Blob — então a guarda
 * de `typeof` não basta, e quem segura é o try/catch do `decodeSource` mais a
 * LÁPIDE (figura que não abre não é reaberta a cada toque).
 *
 * ⚠️ Cor com alfa PARCIAL sai chapada: no vetor a transparência é da forma
 * inteira (`opacity`), não da cor. Abaixo do `ALPHA_THRESHOLD` o pixel conta
 * como vazio e vira `'transparent'`.
 */
import { ALPHA_THRESHOLD } from '../core/quantizeFrames'
import { dataUrlToBlob } from '../export/png'
import type { Vec2, VectorShape } from './model'
import { imageUvAt } from './pickColor'

type ImageShape = Extract<VectorShape, { type: 'image' }>

/**
 * O que saiu do toque. Discriminado porque os quatro desfechos pedem recados
 * DIFERENTES: prometer "toque de novo" para uma figura que nunca vai abrir é
 * pedir paciência para sempre.
 */
export type ImageSample =
  | { kind: 'color'; hex: string }
  /** O pixel é vazio (alfa abaixo do limiar). */
  | { kind: 'transparent' }
  /** Fora da figura — nem com a folga do toque. */
  | { kind: 'outside' }
  /** Abrindo: tocar de novo daqui a pouco funciona. */
  | { kind: 'loading' }
  /** Não abre (PNG quebrado, ambiente sem canvas): insistir não adianta. */
  | { kind: 'failed' }

/**
 * Teto do cache em PIXELS decodificados, não em número de figuras. ⚠️ Contar
 * ENTRADAS foi um defeito real: um cenário de adesivos passa fácil de oito
 * figuras, e a própria pré-carga despejava o que tinha acabado de abrir — as
 * últimas do quadro nunca funcionavam. E oito PNGs de 2048² seriam 128 MB num
 * tablet. 12 Mpx ≈ 48 MB de RGBA.
 */
const MAX_CACHED_PIXELS = 12_000_000

/** `null` = lápide: essa figura não abre, não insistir. */
const decoded = new Map<string, ImageBitmap | null>()
const pending = new Map<string, Promise<void>>()
/**
 * Os `src` do quadro que está na tela: a evicção NUNCA os despeja. É o piso que
 * garante "o que a criança pode tocar agora está aberto", mesmo que o quadro
 * sozinho estoure o teto.
 */
let inUse: ReadonlySet<string> = new Set()
/** Sobe a cada limpeza: decodificação em voo de uma geração velha é descartada. */
let generation = 0

function pixelsOf(bitmap: ImageBitmap | null): number {
  return bitmap ? bitmap.width * bitmap.height : 0
}

function remember(src: string, bitmap: ImageBitmap | null, bornIn: number): void {
  // A limpeza aconteceu enquanto isto decodificava: o resultado é de outra
  // sessão de editor e não pode repovoar o cache de quem veio depois.
  if (bornIn !== generation) {
    bitmap?.close?.()
    return
  }
  decoded.set(src, bitmap)
  let total = 0
  for (const cached of decoded.values()) total += pixelsOf(cached)
  if (total <= MAX_CACHED_PIXELS) return
  for (const [key, cached] of decoded) {
    if (total <= MAX_CACHED_PIXELS) break
    // Protegidas: o quadro na tela e a que acabou de entrar.
    if (key === src || inUse.has(key)) continue
    total -= pixelsOf(cached)
    cached?.close?.()
    decoded.delete(key)
  }
}

/** Uso recente vai para o fim da fila (o Map guarda a ordem de inserção). */
function touch(src: string): void {
  const bitmap = decoded.get(src)
  if (bitmap === undefined) return
  decoded.delete(src)
  decoded.set(src, bitmap)
}

function decodeSource(src: string): Promise<void> {
  if (decoded.has(src)) return Promise.resolve()
  const running = pending.get(src)
  if (running) return running
  const bornIn = generation
  // ⚠️ O `pending.set` vem ANTES da execução: uma IIFE async roda síncrona até
  // o primeiro `await`, e o caminho sem `await` nenhum (data URL malformada)
  // apagaria de `pending` uma chave que só seria escrita depois — deixando a
  // promessa resolvida presa ali para sempre.
  let settle = (): void => {}
  const task = new Promise<void>((resolve) => {
    settle = resolve
  })
  pending.set(src, task)
  void (async () => {
    let bitmap: ImageBitmap | null = null
    try {
      const blob = typeof createImageBitmap === 'undefined' ? null : dataUrlToBlob(src)
      bitmap = blob ? await createImageBitmap(blob) : null
    } catch {
      bitmap = null
    }
    remember(src, bitmap, bornIn)
    pending.delete(src)
    settle()
  })()
  return task
}

/**
 * Abre as figuras deste quadro e as PROTEGE da evicção. Chamada quando o
 * conta-gotas liga: entre escolher a ferramenta e tocar na tela há sempre um
 * intervalo humano, então o toque encontra tudo pronto.
 */
export async function primeImageSources(srcs: readonly string[]): Promise<void> {
  const unique = [...new Set(srcs)]
  inUse = new Set(unique)
  await Promise.all(unique.map(decodeSource))
}

/** Índice de pixel a partir de 0..1, sempre dentro da imagem (u = 1 é o último). */
function pixelIndex(unit: number, size: number): number {
  return Math.min(size - 1, Math.max(0, Math.floor(unit * size)))
}

function hex2(value: number): string {
  return value.toString(16).padStart(2, '0')
}

/**
 * A cor do pixel da figura sob o ponto. `slack` é a MESMA folga do toque que o
 * `hitShapeAt` usou (unidades do documento): sem ela, mirar a beirada do
 * adesivo caía fora da imagem e a criança levava um recado de "estou abrindo"
 * com a figura carregadíssima.
 *
 * No miss do cache, DISPARA a abertura antes de devolver `loading` — senão o
 * "toque de novo daqui a pouquinho" seria mentira: nada estaria abrindo.
 */
export function sampleImageColorAt(shape: ImageShape, point: Vec2, slack = 0): ImageSample {
  const uv = imageUvAt(shape, point, slack)
  if (!uv) return { kind: 'outside' }
  const bitmap = decoded.get(shape.src)
  if (bitmap === undefined) {
    void decodeSource(shape.src)
    return { kind: 'loading' }
  }
  if (bitmap === null) return { kind: 'failed' }
  touch(shape.src)
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const ctx = canvas.getContext('2d')
  if (!ctx) return { kind: 'failed' }
  try {
    // Um pixel de origem para um de destino, sem suavizar: nada de média com os
    // vizinhos. ⚠️ "Exata" só vale com alfa 255: o canvas guarda a cor
    // PRÉ-MULTIPLICADA, então um pixel semitransparente (128..254, que o limiar
    // deixa passar) pode voltar ±1 por canal em relação ao PNG.
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, 1, 1)
    const sx = pixelIndex(uv.x, bitmap.width)
    const sy = pixelIndex(uv.y, bitmap.height)
    ctx.drawImage(bitmap, sx, sy, 1, 1, 0, 0, 1, 1)
    const data = ctx.getImageData(0, 0, 1, 1).data
    if ((data[3] ?? 0) < ALPHA_THRESHOLD) return { kind: 'transparent' }
    return {
      kind: 'color',
      hex: `#${hex2(data[0] ?? 0)}${hex2(data[1] ?? 0)}${hex2(data[2] ?? 0)}`,
    }
  } catch {
    return { kind: 'failed' }
  }
}

/**
 * Larga as figuras abertas. O editor vetorial chama no desmonte: um
 * `ImageBitmap` segurado em JS não é reclamável, e o desenho que a criança
 * fechou não pode continuar ocupando a memória do tablet.
 */
export function clearImageSampleCache(): void {
  generation += 1
  for (const bitmap of decoded.values()) bitmap?.close?.()
  decoded.clear()
  pending.clear()
  inUse = new Set()
}
