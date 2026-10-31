import type { Salvamento } from '@sistemazero/arquipelago-contracts'
import { descobriuNaPraia, PEIXES_DA_PRAIA } from './colecoes-da-praia'

/**
 * A cor da sua ilha (§6.28, A17): quando a criança chega, só o quarto tem cor ("Só o seu quarto
 * ainda tem cor", diz o Zappy). A casa, a horta e o píer começam desbotados e cada um ganha cor
 * quando a criança faz a coisa dele, pelo que o salvamento já guarda (nada novo é gravado):
 * - a casa, ao abrir a porta nova;
 * - a horta, na primeira colheita (é ela que dá o projeto da geladeira);
 * - o píer, no primeiro peixe pescado.
 * Na casa de um irmão (visita), tudo aparece com cor.
 *
 * Desde as lacunas de 01/11/2026 (pela proposta, a cor é o prêmio principal também aqui), cada
 * quadro do Quadro das Cores da sua ilha devolve a cor de uma parte, na ordem de
 * `PARTES_DA_SUA_ILHA`: a casa, a horta, o píer, a praia, o gramado e a trilha das pedras. A cor
 * do quadro soma com a das ações acima (a que vier primeiro pinta). Os quadros feitos vêm do
 * serviço (`/desafios/cores`), como nas ilhas do anel; o salvamento não ganha nada.
 */
export const PARTES_DA_SUA_ILHA = ['casa', 'horta', 'pier', 'praia', 'gramado', 'trilha'] as const
export type ParteDaSuaIlha = (typeof PARTES_DA_SUA_ILHA)[number]
export type CorDaSuaIlha = Record<ParteDaSuaIlha, boolean>

/** O nome de cada parte, para o Zappy. */
export const NOME_DA_PARTE: Readonly<Record<ParteDaSuaIlha, string>> = {
  casa: 'a casa',
  horta: 'a horta',
  pier: 'o píer',
  praia: 'a praia',
  gramado: 'o gramado',
  trilha: 'a trilha das pedras',
}

/** A parte que o quadro `n` (1 a 6) pinta. */
export function parteDoQuadro(n: number): ParteDaSuaIlha | null {
  return PARTES_DA_SUA_ILHA[n - 1] ?? null
}

export function corDaSuaIlha(
  s: Salvamento,
  visitando = false,
  quadros: readonly number[] = [],
): CorDaSuaIlha {
  const doQuadro = (p: ParteDaSuaIlha) => quadros.includes(PARTES_DA_SUA_ILHA.indexOf(p) + 1)
  if (visitando)
    return { casa: true, horta: true, pier: true, praia: true, gramado: true, trilha: true }
  return {
    casa: s.casa.portaNova || doQuadro('casa'),
    horta: Boolean(s.projetos.geladeira) || doQuadro('horta'),
    pier: PEIXES_DA_PRAIA.some((p) => descobriuNaPraia(s, p.id)) || doQuadro('pier'),
    praia: doQuadro('praia'),
    gramado: doQuadro('gramado'),
    trilha: doQuadro('trilha'),
  }
}

/** O que o Zappy diz quando quadros da sua ilha acabam de ficar feitos. */
export function falaDaCorDaSuaIlha(quadros: readonly number[]): string {
  const partes = quadros.map(parteDoQuadro).filter((p): p is ParteDaSuaIlha => p !== null)
  if (partes.length === 0) return 'Desafio feito. Olhe a mancha nova no quadro da praia.'
  const nomes = partes.map((p) => NOME_DA_PARTE[p])
  const lista = nomes.length === 1 ? nomes[0] : `${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1)}`
  return `Desafio feito. A cor voltou para ${lista} da sua ilha.`
}

/** Quanto o desbotado puxa para o cinza (o mesmo do Farol apagado). */
export const QUANTO_DESBOTADO = 0.92
/** A cor volta escorrendo neste tempo (s); com menos movimento, na hora. */
export const DURACAO_DA_COR_S = 1.6

/** Um passo da cor em direção ao alvo (0 com cor, `QUANTO_DESBOTADO` desbotado). */
export function passoDaCor(atual: number, alvo: number, dt: number, naHora: boolean): number {
  if (naHora) return alvo
  const passo = (QUANTO_DESBOTADO / DURACAO_DA_COR_S) * Math.max(0, dt)
  return atual < alvo ? Math.min(alvo, atual + passo) : Math.max(alvo, atual - passo)
}
