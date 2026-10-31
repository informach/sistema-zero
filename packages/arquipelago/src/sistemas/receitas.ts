import { type LugarDaReceita, RECEITAS, type Receita } from '@sistemazero/arquipelago-contracts'

export {
  cestaDoMorador,
  type LugarDaReceita,
  type OrigemDaReceita,
  RECEITAS,
  type Receita,
  receitasDoMorador,
  receitasNovasDoMorador,
} from '@sistemazero/arquipelago-contracts'

import {
  BICHOS_DO_BOSQUE,
  SALVAMENTO_MAX_BYTES,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'
import type { Festa } from './festas'
import { adicionar, type Inventario, quantidade, remover } from './itens'
import { coracoes } from './moradores'
import { VIDA_NO_ANEL } from './moradores-do-anel'

/** O nome do painel da bancada (a escolha da receita quando não há uma só para fazer). */
export const PAINEL_DA_BANCADA = 'bancada'

export function receitaPeloId(id: string): Receita | null {
  return RECEITAS.find((r) => r.id === id) ?? null
}

export function receitaConhecida(r: Receita, s: Salvamento): boolean {
  if (r.origem.tipo === 'amizade')
    return coracoes(s.moradores[r.origem.morador].amizade) >= r.origem.coracoes
  if (r.origem.tipo === 'colecao')
    return BICHOS_DO_BOSQUE.every((b) => s.bichos.achados.includes(b))
  return true
}

/** Saber a receita não depende da estação; preparar o prato da festa depende. */
export function receitaEmEpoca(r: Receita, festa: Festa | null): boolean {
  return r.origem.tipo !== 'festa' || r.origem.festa === festa
}

export function receitasConhecidas(s: Salvamento): Receita[] {
  return RECEITAS.filter((r) => receitaConhecida(r, s))
}

/** Mesma pista no diário e na bancada; nunca oferece um curso ou ingrediente inexistente. */
export function dicaDaReceita(r: Receita, s: Salvamento): string {
  const o = r.origem
  if (o.tipo === 'amizade') {
    const nome = o.morador === 'bento' ? 'Bento' : VIDA_NO_ANEL[o.morador].nome
    const faltam = Math.max(0, o.coracoes - coracoes(s.moradores[o.morador].amizade))
    return faltam > 0
      ? `${nome} ensina com ${o.coracoes} ${o.coracoes === 1 ? 'coração' : 'corações'} de amizade (falta${faltam > 1 ? 'm' : ''} ${faltam}).`
      : `Os pedidos de ${nome} dão ingredientes. Complete o restante com a horta.`
  }
  if (o.tipo === 'colecao')
    return 'Encontre os quatro bichos do Bosque. Os ingredientes vêm da horta.'
  if (o.tipo === 'festa')
    return o.festa === 'junina'
      ? 'Na fogueira da Festa Junina, em junho. O prato pronto fica na mochila depois da festa.'
      : o.festa === 'fim-de-ano'
        ? 'Na bancada durante a festa de fim de ano, de 20 de dezembro a 6 de janeiro. Ela volta todo ano.'
        : 'Na bancada durante o Carnaval. Esta receita volta todo ano.'
  return 'Os ingredientes vêm da horta.'
}

export function podeCozinhar(inv: Inventario, r: Receita): boolean {
  return (
    Object.entries(r.precisa).every(([id, qtd]) => quantidade(inv, id) >= qtd) &&
    quantidade(inv, r.faz.id) - (r.precisa[r.faz.id] ?? 0) + r.faz.qtd <= 999
  )
}

export function cozinhar(inv: Inventario, r: Receita): Inventario | null {
  if (!podeCozinhar(inv, r)) return null
  let novo: Inventario | null = inv
  for (const [id, qtd] of Object.entries(r.precisa)) {
    novo = novo && remover(novo, id, qtd)
  }
  return novo && adicionar(novo, r.faz.id, r.faz.qtd)
}

/** As receitas conhecidas de um lugar que dá para fazer agora, na ordem da lista. */
export function receitasPossiveis(
  inv: Inventario,
  onde: LugarDaReceita,
  conhecidas: readonly Receita[],
): Receita[] {
  return conhecidas.filter((r) => r.onde === onde && podeCozinhar(inv, r))
}

/** Os ingredientes de uma receita escritos para a fala ("1 fubá, 1 leite e 1 ovo"). */
export function ingredientesPorExtenso(r: Receita, nomes: (id: string) => string): string {
  const partes = Object.entries(r.precisa).map(([id, q]) => `${q} ${nomes(id)}`)
  return partes.length > 1
    ? `${partes.slice(0, -1).join(', ')} e ${partes.at(-1)}`
    : (partes[0] ?? '')
}

/** Fazer uma receita no salvamento: tira os ingredientes, põe o prato e a fala do Zappy. */
export function fazerReceita(
  s: Salvamento,
  r: Receita,
  festa: Festa | null = null,
): { salvamento: Salvamento; fala: string } | null {
  if (!receitaEmEpoca(r, festa)) return null
  const inventario = cozinhar(s.inventario, r)
  if (!inventario) return null
  const salvamento = { ...s, inventario }
  if (new TextEncoder().encode(JSON.stringify(salvamento)).byteLength > SALVAMENTO_MAX_BYTES)
    return null
  const feito = r.onde === 'forno' ? 'Saiu do forno' : 'Ficou pronto'
  return {
    salvamento,
    fala: `${feito}: ${r.nome.toLowerCase()}. Clique embaixo para comer.`,
  }
}
