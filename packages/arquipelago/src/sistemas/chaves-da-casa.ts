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
 * pontes. Desde 01/11/2026 (lacunas, pela proposta) a chave abre o cômodo: cada chave da cozinha,
 * da sala e do banheiro deixa fechar mais um cômodo além do quarto, e a do quintal abre a cerca,
 * o caminho e o canteiro. Pisos e janelas ficam livres. Quem já tinha mais cômodos que chaves não
 * perde nenhum: só fechar um novo pede a chave.
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
    libera: 'mais um cômodo',
    plural: false,
    x: 20.5,
    z: -3.6,
  },
  {
    comodo: 'sala',
    nome: 'chave da sala',
    libera: 'mais um cômodo',
    plural: false,
    x: 6.8,
    z: -18.8,
  },
  {
    comodo: 'banheiro',
    nome: 'chave do banheiro',
    libera: 'mais um cômodo',
    plural: false,
    x: -11.5,
    z: 17.2,
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
// Pisos e janelas são livres desde 01/11/2026: a chave abre o cômodo, não o acabamento.
const DONO_DO_PISO: Readonly<Partial<Record<PisoDaCasa, ComodoDaIris>>> = {}
const DONO_DA_JANELA: Readonly<Partial<Record<TipoDeAbertura, ComodoDaIris>>> = {}
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
  if (CHAVES_DE_COMODO.includes(comodo))
    return `Você achou a ${c.nome}. No Construir, a casa já pode ganhar mais um cômodo. ${fim}`
  return `Você achou a ${c.nome}. No Construir, ${c.libera} já ${c.plural ? 'podem' : 'pode'} ir para a casa. ${fim}`
}

/** As chaves que abrem um cômodo novo da casa (a do quintal abre a cerca, o caminho e o canteiro). */
export const CHAVES_DE_COMODO: readonly ComodoDaIris[] = ['cozinha', 'sala', 'banheiro']

/** Quantos cômodos além do quarto a casa pode ter com as chaves achadas. */
export function comodosAbertos(chaves: number): number {
  return CHAVES_DE_COMODO.filter((c) => chaveAchada(chaves, c)).length
}

/**
 * A obra nova fecha um cômodo a mais do que as chaves abrem? (Só conta subir: quem já tinha mais
 * cômodos continua com eles.) Devolve a chave que falta, ou `null`.
 */
export function chaveQueFaltaParaOComodo(
  chaves: number,
  comodosAntes: number,
  comodosDepois: number,
): ComodoDaIris | null {
  if (comodosDepois <= comodosAntes || comodosDepois <= comodosAbertos(chaves)) return null
  return CHAVES_DE_COMODO.find((c) => !chaveAchada(chaves, c)) ?? null
}

/** O recado de um cômodo novo sem a chave dele. */
export function recadoDoComodoTrancado(comodo: ComodoDaIris): string {
  return `Para fechar mais um cômodo, precisa da ${chaveDoComodo(comodo).nome}. Ela está escondida em algum canto da sua ilha.`
}

/** O recado de uma escolha trancada no Construir. */
export function recadoDaTranca(comodo: ComodoDaIris): string {
  return `Precisa da ${chaveDoComodo(comodo).nome}. Ela está escondida em algum canto da sua ilha.`
}

export const TEXTOS_DAS_CHAVES = {
  pegar: (c: ChaveDaCasa) => `Pegar a ${c.nome}`,
  contagem: (n: number) => `Chaves da casa: ${n} de ${COMODOS_DA_IRIS.length}`,
} as const
