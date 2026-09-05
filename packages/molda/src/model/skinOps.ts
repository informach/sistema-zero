/**
 * Operações PURAS sobre peles (bitmaps indexados de uma face ou de uma textura).
 */
import type { MoldaSkin } from '../core/model'

export function createSkin(width: number, height: number): MoldaSkin {
  return { width, height, data: new Uint8Array(width * height) }
}

export function cloneSkin(skin: MoldaSkin): MoldaSkin {
  return { width: skin.width, height: skin.height, data: new Uint8Array(skin.data) }
}

/** Todo texel em 0 (= "cor base" numa face, transparente numa textura). */
export function isSkinBlank(skin: MoldaSkin): boolean {
  for (let i = 0; i < skin.data.length; i += 1) if (skin.data[i] !== 0) return false
  return true
}

/**
 * Re-amostra por VIZINHO MAIS PRÓXIMO (`src = floor(dst × srcSize / dstSize)`):
 * é o que faz a pintura acompanhar a peça quando ela muda de tamanho ou de
 * resolução. Mesmo tamanho devolve a MESMA referência (sem cópia).
 */
export function resampleSkin(skin: MoldaSkin, width: number, height: number): MoldaSkin {
  if (skin.width === width && skin.height === height) return skin
  const out = createSkin(width, height)
  for (let y = 0; y < height; y += 1) {
    const sy = Math.min(skin.height - 1, Math.floor((y * skin.height) / height))
    for (let x = 0; x < width; x += 1) {
      const sx = Math.min(skin.width - 1, Math.floor((x * skin.width) / width))
      out.data[y * width + x] = skin.data[sy * skin.width + sx] ?? 0
    }
  }
  return out
}

/** Espelha na horizontal (coluna 0 ↔ última). Devolve uma pele nova. */
export function flipSkinH(skin: MoldaSkin): MoldaSkin {
  const out = createSkin(skin.width, skin.height)
  for (let y = 0; y < skin.height; y += 1) {
    for (let x = 0; x < skin.width; x += 1) {
      out.data[y * skin.width + (skin.width - 1 - x)] = skin.data[y * skin.width + x] ?? 0
    }
  }
  return out
}

/** Troca todo índice ≥ `limit` por 0 (cor caiu da paleta). Devolve a mesma referência se nada mudou. */
export function clampSkinIndices(skin: MoldaSkin, limit: number): MoldaSkin {
  let dirty = false
  for (let i = 0; i < skin.data.length; i += 1) {
    if ((skin.data[i] ?? 0) >= limit) {
      dirty = true
      break
    }
  }
  if (!dirty) return skin
  const out = cloneSkin(skin)
  for (let i = 0; i < out.data.length; i += 1) if ((out.data[i] ?? 0) >= limit) out.data[i] = 0
  return out
}
