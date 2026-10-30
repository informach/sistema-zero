import {
  BIT_DO_COMODO,
  COMODOS_DA_IRIS,
  type ComodoDaIris,
  chaveAchada,
  type PisoDaCasa,
  type Salvamento,
  type TipoDeAbertura,
} from '@sistemazero/arquipelago-contracts'
import type { Ferramenta } from './construcao/ferramentas'

/**
 * As chaves dos cômodos (N11, levantamento de 30/10). A proposta: na sua ilha, a aventura é
 * "achar a chave de cada cômodo"; a casa da Íris só tem cor no quarto, e a criança desenha o resto
 * (cozinha, sala, banheiro, quintal). Cada chave fica escondida num canto da sua ilha, entre as
 * pontes, e dá cor ao cômodo dela no Construir: o acabamento que é dele fica liberado. Sem chave nenhuma, a
 * casa já cresce com parede, porta, janela redonda, piso de tábua e os objetos dos pedidos.
 */
export interface ChaveDaCasa {
  comodo: ComodoDaIris
  nome: string
  /** O que a chave libera no Construir, dito na fala e no painel (e se é mais de uma coisa). */
  libera: string
  plural: boolean
  /** Onde (x, z) ela fica: no gramado da sua ilha, entre as pontes e fora do lote da casa. */
  x: number
  z: number
}

export const CHAVES_DA_CASA: readonly ChaveDaCasa[] = [
  {
    comodo: 'cozinha',
    nome: 'chave da cozinha',
    libera: 'o piso de ladrilho',
    plural: false,
    x: 20.5,
    z: -3.6,
  },
  {
    comodo: 'sala',
    nome: 'chave da sala',
    libera: 'as janelas grande e em arco',
    plural: true,
    x: 6.8,
    z: -18.8,
  },
  {
    comodo: 'banheiro',
    nome: 'chave do banheiro',
    libera: 'o piso de azulejo',
    plural: false,
    x: -14.9,
    z: 2.1,
  },
  {
    comodo: 'quintal',
    nome: 'chave do quintal',
    libera: 'a cerca, o caminho e o canteiro',
    plural: true,
    x: -6,
    z: 14.8,
  },
]

export function chaveDoComodo(comodo: ComodoDaIris): ChaveDaCasa {
  const c = CHAVES_DA_CASA.find((k) => k.comodo === comodo)
  if (!c) throw new Error(comodo)
  return c
}

/** O cômodo dono de cada acabamento ou ferramenta (sem dono: livre desde o começo). */
const DONO_DO_PISO: Readonly<Partial<Record<PisoDaCasa, ComodoDaIris>>> = {
  ladrilho: 'cozinha',
  azulejo: 'banheiro',
}
const DONO_DA_JANELA: Readonly<Partial<Record<TipoDeAbertura, ComodoDaIris>>> = {
  'janela-grande': 'sala',
  'janela-arco': 'sala',
}
const DONO_DA_FERRAMENTA: Readonly<Partial<Record<Ferramenta, ComodoDaIris>>> = {
  cerca: 'quintal',
  caminho: 'quintal',
  canteiro: 'quintal',
}

export const comodoDoPiso = (p: PisoDaCasa): ComodoDaIris | null => DONO_DO_PISO[p] ?? null
export const comodoDaJanela = (t: TipoDeAbertura): ComodoDaIris | null => DONO_DA_JANELA[t] ?? null
export const comodoDaFerramenta = (f: Ferramenta): ComodoDaIris | null =>
  DONO_DA_FERRAMENTA[f] ?? null

/** Liberado: sem dono, ou com a chave do cômodo dono já achada. */
export function liberado(chaves: number, comodo: ComodoDaIris | null): boolean {
  return comodo === null || chaveAchada(chaves, comodo)
}

export function quantasChaves(chaves: number): number {
  return COMODOS_DA_IRIS.filter((c) => chaveAchada(chaves, c)).length
}

/** Guarda a chave (uma vez só; a segunda vez não muda nada). */
export function guardarChave(s: Salvamento, comodo: ComodoDaIris): Salvamento {
  if (chaveAchada(s.chaves, comodo)) return s
  return { ...s, chaves: s.chaves | BIT_DO_COMODO[comodo] }
}

/** A fala do Zappy ao achar a chave. */
export function falaDaChave(comodo: ComodoDaIris, chavesDepois: number): string {
  const c = chaveDoComodo(comodo)
  const falta = COMODOS_DA_IRIS.length - quantasChaves(chavesDepois)
  const fim =
    falta === 0
      ? 'Agora a casa da Íris tem todas as chaves.'
      : `Ainda ${falta === 1 ? 'falta uma chave' : `faltam ${falta} chaves`} pela ilha.`
  return `Você achou a ${c.nome}. No Construir, ${c.libera} já ${c.plural ? 'podem' : 'pode'} ir para a casa. ${fim}`
}

/** O recado de uma escolha trancada no Construir. */
export function recadoDaTranca(comodo: ComodoDaIris): string {
  return `Precisa da ${chaveDoComodo(comodo).nome}. Ela está escondida em algum canto da sua ilha.`
}

export const TEXTOS_DAS_CHAVES = {
  pegar: (c: ChaveDaCasa) => `Pegar a ${c.nome}`,
  contagem: (n: number) => `Chaves da casa: ${n} de ${COMODOS_DA_IRIS.length}`,
} as const
