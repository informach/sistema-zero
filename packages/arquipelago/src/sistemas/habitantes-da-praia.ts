/** Posições na areia da ilha central, fora do acesso ao píer. Medidas em metros. */
export const HABITANTES_DA_PRAIA = {
  nico: { x: 0, z: 25, giro: Math.PI, escala: 1, raio: 0.43, altura: 1.15, fase: 0 },
  estrelinha: { x: 2, z: 25, giro: Math.PI, escala: 0.3, raio: 0.055, altura: 0.22, fase: 0.25 },
  buzio: { x: 3, z: 26, giro: Math.PI, escala: 0.3, raio: 0.1, altura: 0.22, fase: 1.1 },
} as const

export type HabitanteDaPraia = keyof typeof HABITANTES_DA_PRAIA

export const ACENO_DO_NICO = { alcance: 4, intervalo: 8 } as const

export interface EstadoDoNico {
  tempo: number
  estavaPerto: boolean
  ultimoAceno: number
  acenandoAte: number
}

export function criarEstadoDoNico(): EstadoDoNico {
  return { tempo: 0, estavaPerto: false, ultimoAceno: -Infinity, acenandoAte: 0 }
}

/** Muda somente o estado recebido, sem alocar a cada quadro. O tempo para junto com o jogo. */
export function passoDoNico(
  estado: EstadoDoNico,
  dt: number,
  distanciaAoQuadrado: number,
  duracaoDoAceno: number,
  pausado: boolean,
): 'parado' | 'acenar' {
  if (!pausado) {
    estado.tempo += dt
    const perto = distanciaAoQuadrado < ACENO_DO_NICO.alcance ** 2
    if (
      perto &&
      !estado.estavaPerto &&
      estado.tempo - estado.ultimoAceno >= ACENO_DO_NICO.intervalo
    ) {
      estado.ultimoAceno = estado.tempo
      estado.acenandoAte = estado.tempo + duracaoDoAceno
    }
    estado.estavaPerto = perto
  }
  return estado.tempo < estado.acenandoAte ? 'acenar' : 'parado'
}
