import { ILHAS } from '@sistemazero/arquipelago-contracts'
import type { Ponto } from '../sistemas/cipo'
import { CORPO } from '../sistemas/corpo'
import type { DequeDoPercurso, PontosDoPercurso } from '../sistemas/percurso'
import { raioMaximoDaIlha } from './medidas'

/**
 * A entrega pelos telhados da Vila Doce no referencial do modelo (fase2-05), lida das âncoras do
 * `vila-doce.glb`: `telhados-inicio` (em cima do caixote alto), `telhados-1` a `-3` (o meio do
 * topo plano de cada casinha), `telhados-fim` (o terraço da sorveteria) e `fonte` (o chão da praça).
 */
export const NOMES_DAS_ANCORAS_DOS_TELHADOS = [
  'fonte',
  'telhados-inicio',
  'telhados-1',
  'telhados-2',
  'telhados-3',
  'telhados-fim',
] as const
export type AncorasDosTelhados = Record<(typeof NOMES_DAS_ANCORAS_DOS_TELHADOS)[number], Ponto>

/** O raio de cada parada no plano: o caixote alto (1 × 1 m) e o topo das casinhas (3,3 m). */
export const RAIOS_DAS_PARADAS = [0.6, 1.5, 1.5, 1.5] as const
/** A largada fica no chão, a esta distância do caixote alto, do lado da praça. */
export const LARGADA_ANTES_DOS_CAIXOTES = 2
/**
 * O confeito do pulo fica no meio do caminho entre duas paradas, a esta altura acima do centro do
 * corpo em pé na parada mais alta: o pulo leva o centro a uns 1,5 m acima do de saída, e os pulos
 * daqui sobem no máximo 1 m.
 */
export const CONFEITO_ACIMA_DO_CORPO = 0.2

const VILA = ILHAS.find((i) => i.id === 'vila-doce')
if (!VILA) throw new Error('Sem a Vila Doce no contrato.')
const RAIO_DA_VILA = raioMaximoDaIlha(VILA)

export function telhadosNoModelo(a: AncorasDosTelhados): PontosDoPercurso {
  const paradas = [a['telhados-inicio'], a['telhados-1'], a['telhados-2'], a['telhados-3']]
  const fim = a['telhados-fim']
  const deques: DequeDoPercurso[] = paradas.map((c, i) => {
    const seguinte = paradas[i + 1] ?? fim
    return {
      x: c.x,
      y: c.y,
      z: c.z,
      raio: RAIOS_DAS_PARADAS[i] ?? 1,
      // A volta é o meio do topo: o caixote e as casinhas são pequenos para recuar.
      volta: { x: c.x, y: c.y, z: c.z },
      rumoDaVolta: Math.atan2(seguinte.x - c.x, seguinte.z - c.z),
    }
  })
  const caminho = [...paradas, fim]
  const confeitos: Ponto[] = []
  for (let i = 0; i + 1 < caminho.length; i++) {
    const p = caminho[i]
    const q = caminho[i + 1]
    if (!p || !q) continue
    confeitos.push({
      x: (p.x + q.x) / 2,
      y: Math.max(p.y, q.y) + CORPO.doCentroAoPe + CONFEITO_ACIMA_DO_CORPO,
      z: (p.z + q.z) / 2,
    })
  }
  const caixote = a['telhados-inicio']
  const praca = a.fonte
  const dx = praca.x - caixote.x
  const dz = praca.z - caixote.z
  const d = Math.hypot(dx, dz) || 1
  return {
    largada: {
      x: caixote.x + (dx / d) * LARGADA_ANTES_DOS_CAIXOTES,
      y: praca.y,
      z: caixote.z + (dz / d) * LARGADA_ANTES_DOS_CAIXOTES,
    },
    rumoDaLargada: Math.atan2(-dx, -dz),
    deques,
    chegada: { x: fim.x, y: fim.y, z: fim.z },
    vagalumes: confeitos,
    centro: { x: 0, y: praca.y, z: 0 },
    raioDaIlha: RAIO_DA_VILA,
  }
}
