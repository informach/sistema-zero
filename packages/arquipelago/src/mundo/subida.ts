import { ILHAS } from '@sistemazero/arquipelago-contracts'
import type { Ponto } from '../sistemas/cipo'
import { CORPO } from '../sistemas/corpo'
import type { DequeDoPercurso, PontosDoPercurso } from '../sistemas/percurso'
import { raioMaximoDaIlha } from './medidas'

/**
 * A subida ao cume do Pico Gelado no referencial do modelo (fase3-07), lida das âncoras do
 * `pico.glb`: `subida-largada` (no caminho, antes das bandeirinhas), `subida-1` a `-4` (na linha do
 * meio da trilha, em 1/4, 1/2 e 3/4 do caminho e na entrada do platô), `floco-1` a `-5` (no chão da
 * trilha) e `cume` (o meio do platô). A linha `treno-curva-N` (a mesma trilha, de cima para baixo)
 * diz para onde a trilha sobe em cada parada.
 */
export const PARADAS_DA_SUBIDA = 4
export const FLOCOS_DA_SUBIDA = 5

/** O raio de cada parada no plano: a trilha tem uns 1,5 a 1,9 m de chão; a última é a boca do platô. */
export const RAIOS_DAS_PARADAS_DA_SUBIDA = [1, 1, 1, 1.3] as const
/**
 * O floco flutua a esta altura acima do centro do corpo de quem anda na trilha: pega-se andando
 * pela linha do meio (o alcance do coletável é 0,8 do centro do corpo).
 */
export const FLOCO_ACIMA_DO_CORPO = 0.2

const PICO = ILHAS.find((i) => i.id === 'pico')
if (!PICO) throw new Error('Sem o Pico Gelado no contrato.')
const RAIO_DO_PICO = raioMaximoDaIlha(PICO)

export interface AncorasDaSubida {
  largada: Ponto
  paradas: Ponto[]
  flocos: Ponto[]
  cume: Ponto
  /** A linha do meio da trilha, de cima para baixo (as âncoras `treno-curva-N`). */
  trilha: Ponto[]
}

/** As âncoras da subida no modelo, ou `null` se faltar alguma. */
export function lerAncorasDaSubida(
  achar: (nome: string) => Ponto | undefined,
): AncorasDaSubida | null {
  const largada = achar('subida-largada')
  const cume = achar('cume')
  const paradas = Array.from({ length: PARADAS_DA_SUBIDA }, (_, i) => achar(`subida-${i + 1}`))
  const flocos = Array.from({ length: FLOCOS_DA_SUBIDA }, (_, i) => achar(`floco-${i + 1}`))
  const trilha: Ponto[] = []
  for (let i = 1; ; i++) {
    const p = achar(`treno-curva-${i}`)
    if (!p) break
    trilha.push(p)
  }
  if (!largada || !cume || trilha.length < 2) return null
  if (paradas.some((p) => !p) || flocos.some((p) => !p)) return null
  return { largada, cume, paradas: paradas as Ponto[], flocos: flocos as Ponto[], trilha }
}

/** Para onde a trilha sobe perto de `p`: do ponto da linha mais perto para o de cima. */
function rumoDaSubidaEm(trilha: readonly Ponto[], p: Ponto): number {
  let perto = 0
  let menor = Number.POSITIVE_INFINITY
  for (let i = 0; i < trilha.length; i++) {
    const q = trilha[i]
    if (!q) continue
    const d = Math.hypot(q.x - p.x, q.z - p.z)
    if (d < menor) {
      menor = d
      perto = i
    }
  }
  // A linha vem de cima para baixo: o de cima é o anterior (no alto, o próprio e o seguinte).
  const cima = trilha[Math.max(0, perto - 1)] ?? p
  const baixo = trilha[perto === 0 ? 1 : perto] ?? p
  return Math.atan2(cima.x - baixo.x, cima.z - baixo.z)
}

export function subidaNoModelo(a: AncorasDaSubida): PontosDoPercurso {
  const deques: DequeDoPercurso[] = a.paradas.map((c, i) => ({
    x: c.x,
    y: c.y,
    z: c.z,
    raio: RAIOS_DAS_PARADAS_DA_SUBIDA[i] ?? 1,
    // A volta é o próprio ponto da linha do meio, olhando para onde a trilha sobe.
    volta: { x: c.x, y: c.y, z: c.z },
    rumoDaVolta: rumoDaSubidaEm(a.trilha, c),
  }))
  const primeira = a.paradas[0] ?? a.cume
  return {
    largada: { ...a.largada },
    rumoDaLargada: Math.atan2(primeira.x - a.largada.x, primeira.z - a.largada.z),
    deques,
    chegada: { ...a.cume },
    vagalumes: a.flocos.map((f) => ({
      x: f.x,
      y: f.y + CORPO.doCentroAoPe + FLOCO_ACIMA_DO_CORPO,
      z: f.z,
    })),
    centro: { x: 0, y: a.largada.y, z: 0 },
    raioDaIlha: RAIO_DO_PICO,
  }
}
