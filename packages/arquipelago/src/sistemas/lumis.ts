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
  /** Lumi de luz (B12): a terceira versão da família, que só sai de um baú dos segredos. */
  luz?: true
  /** A cor do corpo, a mesma do material `corpo` do modelo (`arte/lumis/<família>.py`). */
  cor: string
}

/**
 * As 21 espécies: duas por ilha que a lanterna prende (a comum e a rara) e o Lumi de luz de cada
 * família, dos baús (B12), com nome, família e cor do README e dos
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
  // Os Lumis de luz (B12, `arte/lumis`, "Os Lumis de luz"): a forma da rara, mais clara.
  'buzio-de-luz': { nome: 'Búzio de Luz', ilha: 'sua-ilha', raro: true, luz: true, cor: '#b0e8e7' },
  'ipe-de-luz': { nome: 'Ipê de Luz', ilha: 'bosque', raro: true, luz: true, cor: '#c8e7af' },
  'brigadeiro-de-luz': {
    nome: 'Brigadeiro de Luz',
    ilha: 'vila-doce',
    raro: true,
    luz: true,
    cor: '#af9791',
  },
  'perola-de-luz': { nome: 'Pérola de Luz', ilha: 'recife', raro: true, luz: true, cor: '#faeef8' },
  'cristal-de-luz': { nome: 'Cristal de Luz', ilha: 'pico', raro: true, luz: true, cor: '#d2dbfe' },
  'brotinho-de-luz': {
    nome: 'Brotinho de Luz',
    ilha: 'vale-dos-dinos',
    raro: true,
    luz: true,
    cor: '#f9d1ae',
  },
  'pluma-de-luz': { nome: 'Pluma de Luz', ilha: 'nuvens', raro: true, luz: true, cor: '#e5d8fe' },
}
