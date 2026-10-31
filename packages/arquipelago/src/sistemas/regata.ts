import { amostrarRota, REGATA, type RotaDoBarco } from './barco'
import type { Ponto } from './cipo'

/**
 * As boias de presente da volta das boias (lacunas, 01/11/2026): espalhadas pela rota da regata,
 * longe dos cais, alternando para um lado e para o outro dela. Seguindo reto pela rota, o barco
 * passa longe delas: para pegar é preciso guiar para o lado. Uma delas fica escondida (a terceira
 * estrela, como nos percursos).
 */
export const BOIAS_DA_REGATA = 8
/** Quanto a boia fica para o lado da linha da rota (o barco vai até `REGATA.lado`). */
export const LADO_DA_BOIA = 2.4
/** O barco pega a boia com o meio do casco a esta distância. */
export const RAIO_DA_BOIA = 1.6

export function boiasDaRegata(rota: RotaDoBarco): Ponto[] {
  const saida = { x: 0, y: 0, z: 0, giro: 0 }
  const boias: Ponto[] = []
  for (let i = 0; i < BOIAS_DA_REGATA; i++) {
    // Entre 15% e 85% da rota: longe do cais na saída e na chegada.
    const d = rota.comprimento * (0.15 + (0.7 * i) / (BOIAS_DA_REGATA - 1))
    amostrarRota(rota, d, saida)
    const lado = (i % 2 === 0 ? 1 : -1) * Math.min(LADO_DA_BOIA, REGATA.lado)
    boias.push({
      x: saida.x + Math.sin(saida.giro) * lado,
      y: 0.4,
      z: saida.z + Math.cos(saida.giro) * lado,
    })
  }
  return boias
}
