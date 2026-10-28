import { adicionar, type Inventario, quantidade, remover } from './itens'

export interface Receita {
  id: string
  nome: string
  precisa: Record<string, number>
  faz: { id: string; qtd: number }
}

/** Receitas desta fase. Mais receitas chegam com os moradores e as festas. */
export const RECEITAS: Receita[] = [
  {
    id: 'salada',
    nome: 'Salada da horta',
    precisa: { alface: 1, tomate: 1 },
    faz: { id: 'salada', qtd: 1 },
  },
  { id: 'pipoca', nome: 'Pipoca', precisa: { milho: 1 }, faz: { id: 'pipoca', qtd: 2 } },
]

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

/** A primeira receita que dá para fazer agora (a bancada oferece essa). */
export function receitaPossivel(inv: Inventario): Receita | null {
  return RECEITAS.find((r) => podeCozinhar(inv, r)) ?? null
}
