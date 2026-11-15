import type { PecaNaFaisca } from './composicao-faisca'
import type { PontoDaFaisca } from './faisca'

/** Bancada de ensaio no campo aberto: não move âncoras da praça/horta nem troca o lago. */
export const CURVA_DA_PROVA = { x: 52.4, z: 172.1 }
export const INICIO_DA_PROVA = { x: 36, z: 171 }
export const FIM_DA_PROVA = { x: 53.5, z: 181.5 }
export const PECAS_DO_CAMINHO: PecaNaFaisca[] = [
  {
    id: 'prova-reto-1',
    peca: 'caminho_terra_reto',
    x: 39.5,
    z: 171,
    giro: 0,
    escala: 1,
    altura: 4,
    solida: 'malha',
  },
  {
    id: 'prova-reto-2',
    peca: 'caminho_terra_reto',
    x: 46.5,
    z: 171,
    giro: 0,
    escala: 1,
    altura: 4,
    solida: 'malha',
  },
  {
    id: 'prova-curva',
    peca: 'caminho_terra_curvo',
    ...CURVA_DA_PROVA,
    giro: 0,
    escala: 1,
    altura: 4,
    solida: 'malha',
  },
  {
    id: 'prova-reto-3',
    peca: 'caminho_terra_reto',
    x: 53.5,
    z: 178,
    giro: -Math.PI / 2,
    escala: 1,
    altura: 4,
    solida: 'malha',
  },
]
export const PECAS_DO_ACERVO: PecaNaFaisca[] = [
  {
    id: 'prova-arvore-1',
    peca: 'arvore_04_pacote',
    x: 33,
    z: 175,
    giro: 0.2,
    escala: 1,
    solida: 'tronco',
    raioDoTronco: 0.86,
  },
  {
    id: 'prova-arvore-2',
    peca: 'arvore_04_pacote',
    x: 59,
    z: 181,
    giro: 1,
    escala: 1,
    solida: 'tronco',
    raioDoTronco: 0.86,
  },
  {
    id: 'prova-arbusto',
    peca: 'arbusto_04_pacote',
    x: 43,
    z: 176.5,
    giro: 0.6,
    escala: 1,
    solida: 'caixa',
  },
  { id: 'prova-folhagem', peca: 'folhagem_01_pacote', x: 58, z: 170, giro: 0.4, escala: 1 },
  {
    id: 'prova-barril',
    peca: 'barril_01_pacote',
    x: 34,
    z: 170,
    giro: 0.1,
    escala: 1,
    solida: 'caixa',
  },
  {
    id: 'prova-cerca',
    peca: 'cerca_02_pacote',
    x: 40,
    z: 167,
    giro: 0,
    escala: 1,
    solida: 'caixa',
  },
  {
    id: 'prova-casa',
    peca: 'casa_02_pacote',
    x: 63,
    z: 175,
    giro: Math.PI,
    escala: 0.45,
    solida: 'caixa',
  },
]
export const ROTA_DA_PROVA: PontoDaFaisca[] = [
  INICIO_DA_PROVA,
  { x: 43, z: 171 },
  { x: 50, z: 171 },
  ...Array.from({ length: 12 }, (_, i) => {
    const a = ((i + 1) * Math.PI) / 24
    return { x: 50 + 3.5 * Math.sin(a), z: 174.5 - 3.5 * Math.cos(a) }
  }),
  FIM_DA_PROVA,
]
export function tipoDaCuradoria(pedido: unknown): 'a' | 'b' | null {
  return pedido === 'a' || pedido === 'b' ? pedido : null
}
