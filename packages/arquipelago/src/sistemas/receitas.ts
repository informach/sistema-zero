import type { Salvamento } from '@sistemazero/arquipelago-contracts'
import { adicionar, type Inventario, quantidade, remover } from './itens'

/** O nome do painel da bancada (a escolha da receita quando não há uma só para fazer). */
export const PAINEL_DA_BANCADA = 'bancada'

/** Onde a receita se faz: a bancada da ilha (fogão e pia) ou o forno da casa (projeto azul). */
export type LugarDaReceita = 'bancada' | 'forno' | 'fogueira'

export interface Receita {
  id: string
  nome: string
  precisa: Record<string, number>
  faz: { id: string; qtd: number }
  onde: LugarDaReceita
  /** Com quantos corações o Bento lembra e ensina esta receita (sem: já se sabe desde o começo). */
  bento?: number
}

/**
 * As receitas. A salada e a pipoca já se sabem; as da Vila Doce o Bento lembra conforme a amizade
 * (fase2-04): o bolo de fubá com um coração, o pão de queijo com dois, o brigadeiro com três e o
 * chocolate quente com quatro.
 */
export const RECEITAS: Receita[] = [
  {
    id: 'pipoca-de-festa',
    nome: 'Pipoca de festa',
    precisa: { milho: 1 },
    faz: { id: 'pipoca-de-festa', qtd: 1 },
    onde: 'fogueira',
  },
  {
    id: 'salada',
    nome: 'Salada da horta',
    precisa: { alface: 1, tomate: 1 },
    faz: { id: 'salada', qtd: 1 },
    onde: 'bancada',
  },
  {
    id: 'pipoca',
    nome: 'Pipoca',
    precisa: { milho: 1 },
    faz: { id: 'pipoca', qtd: 2 },
    onde: 'bancada',
  },
  {
    id: 'bolo-de-fuba',
    nome: 'Bolo de fubá',
    precisa: { fuba: 1, leite: 1, ovo: 1 },
    faz: { id: 'bolo-de-fuba', qtd: 1 },
    onde: 'forno',
    bento: 1,
  },
  {
    id: 'pao-de-queijo',
    nome: 'Pão de queijo',
    precisa: { polvilho: 1, queijo: 1 },
    faz: { id: 'pao-de-queijo', qtd: 3 },
    onde: 'forno',
    bento: 2,
  },
  {
    id: 'brigadeiro',
    nome: 'Brigadeiro',
    precisa: { cacau: 1, leite: 2 },
    faz: { id: 'brigadeiro', qtd: 4 },
    onde: 'bancada',
    bento: 3,
  },
  {
    id: 'chocolate-quente',
    nome: 'Chocolate quente',
    precisa: { cacau: 1, leite: 1 },
    faz: { id: 'chocolate-quente', qtd: 1 },
    onde: 'bancada',
    bento: 4,
  },
]

export function receitaPeloId(id: string): Receita | null {
  return RECEITAS.find((r) => r.id === id) ?? null
}

/** As receitas que a pessoa sabe com `coracoesDoBento` corações de amizade com o Bento. */
export function receitasConhecidas(coracoesDoBento: number): Receita[] {
  return RECEITAS.filter((r) => (r.bento ?? 0) <= coracoesDoBento)
}

export function podeCozinhar(inv: Inventario, r: Receita): boolean {
  return Object.entries(r.precisa).every(([id, qtd]) => quantidade(inv, id) >= qtd)
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
): { salvamento: Salvamento; fala: string } | null {
  const inventario = cozinhar(s.inventario, r)
  if (!inventario) return null
  const feito = r.onde === 'forno' ? 'Saiu do forno' : 'Ficou pronto'
  return {
    salvamento: { ...s, inventario },
    fala: `${feito}: ${r.nome.toLowerCase()}. Clique embaixo para comer.`,
  }
}
