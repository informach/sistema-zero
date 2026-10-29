/** Elevadores verticais. O tempo pertence à montagem e só avança em passos físicos ativos. */
export const PLATAFORMAS_DAS_NUVENS = { altura: 2.4, viagem: 6, espera: 4, ciclo: 20 } as const

/** Índice zero para a primeira. Vizinhas alternadas, velocidade zero nas duas pontas. */
export function elevacaoDaPlataforma(indice: number, segundos: number): number {
  const { altura, viagem, espera, ciclo } = PLATAFORMAS_DAS_NUVENS
  const fase = (((segundos + ((indice % 2) * ciclo) / 2) % ciclo) + ciclo) % ciclo
  if (fase < espera) return 0
  if (fase < espera + viagem) {
    const t = (fase - espera) / viagem
    return altura * t * t * (3 - 2 * t)
  }
  if (fase < 2 * espera + viagem) return altura
  const t = (fase - 2 * espera - viagem) / viagem
  return altura * (1 - t * t * (3 - 2 * t))
}

export function avancarPlataformas(segundos: number, dt: number, pausado: boolean): number {
  return pausado ? segundos : (segundos + dt) % PLATAFORMAS_DAS_NUVENS.ciclo
}
