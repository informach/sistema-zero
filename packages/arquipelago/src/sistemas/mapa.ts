import {
  ILHAS,
  type Ilha,
  type IlhaId,
  ilhaAberta,
  ilhaVisitada,
} from '@sistemazero/arquipelago-contracts'

/**
 * O mapa do arquipélago na mesa de mapas da Maré (fase3-03): as oito ilhas no papel, na mesma
 * posição do anel do mundo (`centroNoAnel`: x pelo cosseno do ângulo, z pelo seno, visto de
 * cima). A jornada abre o acesso; a presença no chão registra a visita separadamente.
 */
export const PAINEL_DO_MAPA = 'mapa'
/** De que distância (no chão) a mesa de mapas abre o mapa. */
export const ALCANCE_DO_MAPA = 2
export const ROTULO_DO_MAPA = 'Ver o mapa do arquipélago'

/** O papel do mapa vai de 0 a 100 nos dois eixos; o anel fica a este raio do meio. */
export const RAIO_DO_ANEL_NO_MAPA = 36

export interface IlhaNoMapa {
  ilha: Ilha
  /** Onde a ilha fica no papel (0 a 100). */
  x: number
  y: number
  aberta: boolean
  visitada: boolean
  aqui: boolean
}

export function ilhasNoMapa(posicao: number, aqui: IlhaId | null, visitas = 0): IlhaNoMapa[] {
  return ILHAS.map((ilha) => {
    const a = ((ilha.angulo ?? 0) * Math.PI) / 180
    // A sua ilha fica no meio; o Farol fica nela, ao lado da casa.
    const lugar =
      ilha.id === 'farol'
        ? { x: 56, y: 45 }
        : ilha.angulo === null
          ? { x: 50, y: 50 }
          : {
              x: 50 + Math.cos(a) * RAIO_DO_ANEL_NO_MAPA,
              y: 50 + Math.sin(a) * RAIO_DO_ANEL_NO_MAPA,
            }
    return {
      ilha,
      ...lugar,
      aberta: ilhaAberta(ilha.id, posicao),
      visitada: ilhaVisitada(visitas, ilha.id),
      aqui: ilha.id === aqui,
    }
  })
}

/** Quantas ilhas do mapa já abriram (o Farol conta quando acende). */
export function abertasNoMapa(posicao: number): number {
  return ILHAS.filter((i) => ilhaAberta(i.id, posicao)).length
}

export function visitadasNoMapa(visitas: number): number {
  return ILHAS.filter((i) => ilhaVisitada(visitas, i.id)).length
}
