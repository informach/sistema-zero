import type { QuartoDoJogo } from '@sistemazero/arquipelago-contracts'
import { ROOM_ITEM_INFO } from '@sistemazero/avatar-quarto/quarto/catalog'
import { cellToWorld, effectiveFootprint, type Rot } from '@sistemazero/avatar-quarto/quarto/coords'

/**
 * Onde o personagem pode aparecer dentro do quarto (regra pura, sem React nem física). Cada criança
 * arruma o quarto de um jeito, então o ponto de sempre pode estar embaixo de um móvel: procura o
 * lugar livre mais perto dele.
 */

/** Folga entre o corpo do personagem e um móvel ou parede (o raio da cápsula e um pouco mais). */
export const FOLGA_DO_CORPO = 0.5
/** De quanto em quanto a procura anda pelo chão do quarto. */
export const PASSO_DA_PROCURA = 0.25
/** O colisor de cada móvel fica esta medida para dentro da pegada (igual a `ColisaoDosMoveis`). */
const RECUO_DO_COLISOR = 0.08

interface Caixa {
  x: number
  z: number
  meioX: number
  meioZ: number
}

/** As caixas dos móveis de chão, no espaço do quarto (centro do quarto na origem). */
export function caixasDosMoveis(quarto: QuartoDoJogo): Caixa[] {
  const caixas: Caixa[] = []
  for (const p of quarto.placedItems) {
    const info = ROOM_ITEM_INFO[p.itemId]
    if (!info || info.mount === 'wall' || p.on) continue
    const fp = effectiveFootprint(info.w, info.h, (p.rot ?? 0) as Rot)
    const c = cellToWorld(p.x, p.y, fp.w, fp.h)
    caixas.push({
      x: c.x,
      z: c.z,
      meioX: Math.max(0.2, fp.w / 2 - RECUO_DO_COLISOR),
      meioZ: Math.max(0.2, fp.h / 2 - RECUO_DO_COLISOR),
    })
  }
  return caixas
}

/** O ponto (no espaço do quarto) cabe o corpo inteiro, longe dos móveis e das paredes? */
export function pontoLivre(
  x: number,
  z: number,
  caixas: readonly Caixa[],
  quarto: { largura: number; fundo: number },
): boolean {
  if (Math.abs(x) > quarto.largura / 2 - FOLGA_DO_CORPO) return false
  if (Math.abs(z) > quarto.fundo / 2 - FOLGA_DO_CORPO) return false
  return caixas.every(
    (c) =>
      Math.abs(x - c.x) >= c.meioX + FOLGA_DO_CORPO ||
      Math.abs(z - c.z) >= c.meioZ + FOLGA_DO_CORPO,
  )
}

/**
 * O lugar livre mais perto do `preferido` (espaço do quarto). Livre, devolve o próprio `preferido`
 * (o mesmo objeto, para quem chamou saber que não precisa mexer). Com o quarto todo tomado, devolve
 * `null` e quem chamou usa a saída (a porta).
 */
export function lugarLivreNoQuarto(
  quarto: QuartoDoJogo,
  preferido: { x: number; z: number },
  medidas: { largura: number; fundo: number },
): { x: number; z: number } | null {
  const caixas = caixasDosMoveis(quarto)
  if (pontoLivre(preferido.x, preferido.z, caixas, medidas)) return preferido
  const candidatos: { x: number; z: number; d: number }[] = []
  const limX = medidas.largura / 2 - FOLGA_DO_CORPO
  const limZ = medidas.fundo / 2 - FOLGA_DO_CORPO
  for (let x = -limX; x <= limX + 1e-6; x += PASSO_DA_PROCURA) {
    for (let z = -limZ; z <= limZ + 1e-6; z += PASSO_DA_PROCURA) {
      candidatos.push({ x, z, d: Math.hypot(x - preferido.x, z - preferido.z) })
    }
  }
  candidatos.sort((a, b) => a.d - b.d)
  const achado = candidatos.find((c) => pontoLivre(c.x, c.z, caixas, medidas))
  return achado ? { x: achado.x, z: achado.z } : null
}
