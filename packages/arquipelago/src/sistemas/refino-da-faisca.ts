export type PisoDaFaisca = 'reino' | 'faroeste' | 'templo'
export function pisoDoRefino(valor: unknown): PisoDaFaisca | null {
  return valor === 'reino' || valor === 'templo' || valor === 'faroeste' ? valor : null
}
/** A substituição da bacia permanece reversível e explícita até o aceite L1/L2. */
export const LAGO_DE_CATALOGO =
  typeof location !== 'undefined' && new URLSearchParams(location.search).get('lago') === 'l2'
export const PISOS_DO_REFINO = {
  reino: 'caminho_terra_reto',
  faroeste: 'trilha_terra_reta',
  templo: 'caminho_lajes_reto',
} as const
export const EIXO_DO_PISO = {
  fim: { x: 20, z: 139 },
  giro: -Math.atan2(2.1, Math.sqrt(21 ** 2 - 2.1 ** 2)),
  comprimento: 21,
}
export const INICIO_DO_PISO = {
  x: 20 - 21 * Math.cos(EIXO_DO_PISO.giro),
  z: 139 + 21 * Math.sin(EIXO_DO_PISO.giro),
}
