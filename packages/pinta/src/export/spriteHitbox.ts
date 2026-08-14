/**
 * A CAIXA DE COLISÃO tirada do próprio desenho.
 *
 * O problema: um quadro 128x128 com uma nave de 128x32 tem 96px de vazio, e no
 * Estúdio a caixa de colisão é o RETÂNGULO do sprite — o vazio encosta sem
 * encostar. Aqui o Pinta mede ONDE de fato tem pixel e manda junto pela ponte;
 * o Estúdio aplica sozinho, sem a criança pôr um bloco.
 *
 * ⭐ Três decisões que fazem isto funcionar:
 *
 * 1. **UNIÃO de todos os quadros**, nunca por quadro. Caixa por quadro pulsaria
 *    com a animação — o braço estica no golpe e a colisão muda sozinha. O jogo
 *    viraria loteria.
 * 2. **FRAÇÃO do quadro (0..1)**, nunca pixels. O mesmo desenho pode ser posto
 *    no jogo em qualquer tamanho; fração acompanha, pixel não.
 * 3. **Desenho que preenche o quadro OMITE a chave.** Quem já usava o quadro
 *    inteiro continua com payload byte-idêntico e comportamento idêntico — a
 *    caixa automática só aparece quando ela de fato aperta.
 */
import type { PintaBitmap, PintaPixelFrame, PintaPixelLayer, VectorFrame } from '../core/project'
import type { PintaSpriteHitbox } from '../core/types'
import { flattenCels } from '../pixel/layers'
import { type Bounds, shapeBounds } from '../vector/geometry'
import { visibleShapes } from '../vector/model'

interface Caixa {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

const VAZIA: Caixa = {
  minX: Number.POSITIVE_INFINITY,
  minY: Number.POSITIVE_INFINITY,
  maxX: 0,
  maxY: 0,
}

function juntar(a: Caixa, b: Caixa): Caixa {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  }
}

/** Retângulo dos pixels OPACOS (índice 0 = transparente). */
function boundsDoBitmap(bitmap: PintaBitmap): Caixa {
  let caixa = VAZIA
  for (let y = 0; y < bitmap.height; y += 1) {
    for (let x = 0; x < bitmap.width; x += 1) {
      if (bitmap.data[y * bitmap.width + x] === 0) continue
      caixa = juntar(caixa, { minX: x, minY: y, maxX: x + 1, maxY: y + 1 })
    }
  }
  return caixa
}

/**
 * Converte para fração do quadro. `null` quando não há o que apertar: desenho
 * vazio, ou arte que já preenche o quadro inteiro.
 */
function fracao(caixa: Caixa, largura: number, altura: number): PintaSpriteHitbox | null {
  if (!Number.isFinite(caixa.minX) || largura <= 0 || altura <= 0) return null
  const x = Math.max(0, Math.min(1, caixa.minX / largura))
  const y = Math.max(0, Math.min(1, caixa.minY / altura))
  const w = Math.max(0, Math.min(1 - x, (caixa.maxX - caixa.minX) / largura))
  const h = Math.max(0, Math.min(1 - y, (caixa.maxY - caixa.minY) / altura))
  if (w <= 0 || h <= 0) return null
  // Preenche o quadro inteiro: nada a declarar (payload byte-idêntico ao de antes).
  if (x === 0 && y === 0 && w === 1 && h === 1) return null
  const casas = (valor: number) => Math.round(valor * 1000) / 1000
  return { x: casas(x), y: casas(y), w: casas(w), h: casas(h) }
}

/** A união dos pixels pintados de TODOS os quadros de pixel art. */
export function pixelSpriteHitbox(
  frames: readonly PintaPixelFrame[],
  layers: readonly PintaPixelLayer[],
  frameWidth: number,
  frameHeight: number,
): PintaSpriteHitbox | null {
  let caixa = VAZIA
  for (const frame of frames) {
    // ⚠️ ACHATADO: camada escondida não conta, exatamente como no export.
    const plano = flattenCels(frame, layers)
    if (plano) caixa = juntar(caixa, boundsDoBitmap(plano))
  }
  return fracao(caixa, frameWidth, frameHeight)
}

/**
 * ⚠️ `shapeBounds` IGNORA a rotação, e o `svg.ts` a RENDERIZA (`rotate()` ao redor
 * do centro). Para o editor a aproximação serve (a alça fica perto da forma), mas
 * colisão é outra coisa: uma espada girada 45 graus ficaria com caixa ~30% menor
 * que o desenho e o golpe passaria por dentro do inimigo. Aqui a caixa cresce
 * para caber o retângulo girado. O centro não se move, só a extensão.
 */
function giradaAoRedorDoCentro(b: Bounds, rotation: number): Bounds {
  const graus = ((rotation % 360) + 360) % 360
  if (graus === 0) return b
  const rad = (graus * Math.PI) / 180
  const cos = Math.abs(Math.cos(rad))
  const sen = Math.abs(Math.sin(rad))
  const width = b.width * cos + b.height * sen
  const height = b.width * sen + b.height * cos
  return { x: b.x + (b.width - width) / 2, y: b.y + (b.height - height) / 2, width, height }
}

/** A união das formas VISÍVEIS de todos os quadros vetoriais. */
export function vectorSpriteHitbox(
  frames: readonly VectorFrame[],
  frameWidth: number,
  frameHeight: number,
): PintaSpriteHitbox | null {
  let caixa = VAZIA
  for (const frame of frames) {
    for (const shape of visibleShapes([...frame])) {
      const b = giradaAoRedorDoCentro(shapeBounds(shape), shape.rotation)
      if (b.width <= 0 || b.height <= 0) continue
      caixa = juntar(caixa, { minX: b.x, minY: b.y, maxX: b.x + b.width, maxY: b.y + b.height })
    }
  }
  return fracao(caixa, frameWidth, frameHeight)
}
