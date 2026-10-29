import type { IlhaId, LumiId } from '@sistemazero/arquipelago-contracts'

/**
 * As espécies de Lumi (o nome, a ilha da família, se é a rara e a cor), num lugar só: o álbum
 * (fase2-09) e os borrões da noite (fase2-06) leem daqui.
 */

export interface EspecieDeLumi {
  nome: string
  /** A ilha da família (a praia é a sua ilha). */
  ilha: IlhaId
  raro: boolean
  /** A cor do corpo, a mesma do material `corpo` do modelo (`arte/lumis/<família>.py`). */
  cor: string
}

/**
 * As 14 espécies, duas por ilha (a comum e a rara), com nome, família e cor do README e dos
 * scripts de `arte/lumis`. Os nomes da praia (Estrelinha e Búzio) são provisórios até a dona
 * confirmar (README de lá).
 */
export const ESPECIES_DE_LUMI: Readonly<Record<LumiId, EspecieDeLumi>> = {
  estrelinha: { nome: 'Estrelinha', ilha: 'sua-ilha', raro: false, cor: '#ff9a3c' },
  buzio: { nome: 'Búzio', ilha: 'sua-ilha', raro: true, cor: '#5fd6cf' },
  pitanga: { nome: 'Pitanga', ilha: 'bosque', raro: false, cor: '#f2401f' },
  ipe: { nome: 'Ipê', ilha: 'bosque', raro: true, cor: '#8fd35f' },
  quindim: { nome: 'Quindim', ilha: 'vila-doce', raro: false, cor: '#ffc61f' },
  brigadeiro: { nome: 'Brigadeiro', ilha: 'vila-doce', raro: true, cor: '#5e3524' },
  bolha: { nome: 'Bolha', ilha: 'recife', raro: false, cor: '#c79cff' },
  perola: { nome: 'Pérola', ilha: 'recife', raro: true, cor: '#f4e2f4' },
  gelinho: { nome: 'Gelinho', ilha: 'pico', raro: false, cor: '#93ddff' },
  cristal: { nome: 'Cristal', ilha: 'pico', raro: true, cor: '#a3bcff' },
  ovinho: { nome: 'Ovinho', ilha: 'vale-dos-dinos', raro: false, cor: '#6fd38b' },
  brotinho: { nome: 'Brotinho', ilha: 'vale-dos-dinos', raro: true, cor: '#f3a85e' },
  algodao: { nome: 'Algodão', ilha: 'nuvens', raro: false, cor: '#ffffff' },
  pluma: { nome: 'Pluma', ilha: 'nuvens', raro: true, cor: '#c9b6ff' },
}
