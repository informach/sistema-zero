export type PisoDaFaisca = 'reino' | 'faroeste' | 'templo'
export function pisoDoRefino(valor: unknown): PisoDaFaisca | null {
  return valor === 'reino' || valor === 'templo' || valor === 'faroeste' ? valor : null
}
/** Proposta reversível apenas no playground /macro; o jogo integrado não troca a bacia. */
const parametros = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null
export const LAGO_DE_CATALOGO =
  parametros?.get('lago') === 'l2' ||
  (typeof location !== 'undefined' &&
    location.pathname === '/macro' &&
    !parametros?.has('lago') &&
    !parametros?.has('curadoria'))
export const PISOS_DO_REFINO = {
  reino: 'caminho_terra_reto',
  faroeste: 'trilha_terra_reta',
  templo: 'caminho_lajes_reto',
} as const
export const CURVAS_DO_REFINO = {
  reino: 'caminho_terra_curvo',
  faroeste: 'trilha_terra_curva',
  templo: 'caminho_lajes_curvo',
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
