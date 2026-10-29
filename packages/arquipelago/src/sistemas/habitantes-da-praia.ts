/**
 * Posições na areia da ilha central, fora do acesso ao píer. Medidas em metros. Os Lumis ficam com
 * uns 37 cm (escala 0,5): com 22 cm eles sumiam na areia vistos da câmera do jogo.
 */
export const HABITANTES_DA_PRAIA = {
  nico: { x: 0, z: 25, giro: Math.PI, escala: 1, raio: 0.43, altura: 1.15 },
  estrelinha: { x: 2, z: 25, giro: Math.PI, escala: 0.5, raio: 0.09, altura: 0.36 },
  buzio: { x: 3, z: 26, giro: Math.PI, escala: 0.5, raio: 0.16, altura: 0.36 },
} as const

export type HabitanteDaPraia = keyof typeof HABITANTES_DA_PRAIA

/**
 * O aceno do Nico (`alcance` e `intervalo` em metros e segundos) e o olhar: a até `olharDe` metros
 * ele vira para a criança, a `rapidezDoGiro` (a mesma conta do giro da Capi); longe, volta ao descanso.
 */
export const ACENO_DO_NICO = { alcance: 4, intervalo: 8, olharDe: 6, rapidezDoGiro: 4 } as const

/** Para onde o Nico olha: para a criança quando ela está perto, senão para o giro de descanso. */
export function olharDoNico(crianca: { x: number; z: number }): number {
  const { x, z, giro } = HABITANTES_DA_PRAIA.nico
  const dx = crianca.x - x
  const dz = crianca.z - z
  const d2 = dx * dx + dz * dz
  if (d2 === 0 || d2 > ACENO_DO_NICO.olharDe ** 2) return giro
  return Math.atan2(dx, dz)
}

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
