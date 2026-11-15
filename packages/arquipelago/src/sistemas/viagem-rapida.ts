import { type Ilha, ilhaAberta, ilhaVisitada } from '@sistemazero/arquipelago-contracts'
import { alturaDaIlha, trajetoDaPonte } from '../mundo/medidas'
import { CHEGADA_DA_VISITA } from './visitas'

/**
 * Viagem rápida pelo mapa (avaliação de jogabilidade de 14/11/2026): a criança tem 30 minutos por
 * dia e as pontes são longas. Do mapa, uma ilha já visitada e aberta leva até ela num instante: na
 * sua ilha, à frente da casa; nas do anel, no fim da ponte, já do lado da ilha, olhando para ela
 * (é dali que a ilha completa carrega, como para quem chega andando).
 *
 * Não vale na corrida de um percurso (seria atalho no cronômetro), na visita à casa de um irmão
 * (a visita fica na ilha central) nem para a ilha em que ela já está.
 */

/** Em que ponto da ponte ela chega (0 = na sua ilha, 1 = na borda da ilha do anel). */
export const CHEGADA_NA_PONTE = 0.88

export interface ChegadaDaViagem {
  x: number
  y: number
  z: number
  /** Para onde ela olha ao chegar (giro `d` olha para `(sin d, cos d)`). */
  olhar: number
}

/** Onde a viagem chega (`null` no Farol: ele fica na sua ilha e tem a porta dele). */
export function chegadaDaViagem(ilha: Ilha): ChegadaDaViagem | null {
  if (ilha.id === 'sua-ilha') {
    const { x, z, olhar } = CHEGADA_DA_VISITA
    return { x, y: alturaDaIlha(x, z) + 1.2, z, olhar }
  }
  if (ilha.angulo === null) return null
  const pontos = trajetoDaPonte(ilha, 50)
  const p = pontos[Math.round(CHEGADA_NA_PONTE * (pontos.length - 1))]
  if (!p) return null
  const a = (ilha.angulo * Math.PI) / 180
  return { x: p.x, y: p.y + 1.2, z: p.z, olhar: Math.atan2(Math.cos(a), Math.sin(a)) }
}

export type RecusaDaViagem =
  | 'fechada'
  | 'nao-visitada'
  | 'aqui'
  | 'corrida'
  | 'visita'
  | 'sem-chegada'

/** Pode viajar para a ilha agora? `null` = pode; senão, o motivo. */
export function recusaDaViagem(
  ilha: Ilha,
  e: {
    posicao: number
    visitas: number
    aqui: string | null
    correndo: boolean
    visitando: boolean
  },
): RecusaDaViagem | null {
  if (e.correndo) return 'corrida'
  if (e.visitando) return 'visita'
  if (!ilhaAberta(ilha.id, e.posicao)) return 'fechada'
  if (!ilhaVisitada(e.visitas, ilha.id)) return 'nao-visitada'
  if (ilha.id === e.aqui) return 'aqui'
  if (!chegadaDaViagem(ilha)) return 'sem-chegada'
  return null
}
