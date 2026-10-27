import type { Semente } from '@sistemazero/arquipelago-contracts'

/** Os itens do jogo. O inventário guarda `id → quantidade`; id desconhecido é ignorado. */
export interface Item {
  id: string
  nome: string
  emoji: string
  /** Se dá para comer: quanto repõe de cada necessidade. */
  comida?: { fome: number; diversao?: number; energia?: number }
}

export const ITENS: Record<string, Item> = {
  'semente-alface': { id: 'semente-alface', nome: 'Semente de alface', emoji: '🌱' },
  'semente-tomate': { id: 'semente-tomate', nome: 'Semente de tomate', emoji: '🌱' },
  'semente-milho': { id: 'semente-milho', nome: 'Semente de milho', emoji: '🌱' },
  alface: { id: 'alface', nome: 'Alface', emoji: '🥬', comida: { fome: 8 } },
  tomate: { id: 'tomate', nome: 'Tomate', emoji: '🍅', comida: { fome: 10 } },
  milho: { id: 'milho', nome: 'Milho', emoji: '🌽', comida: { fome: 10 } },
  salada: { id: 'salada', nome: 'Salada da horta', emoji: '🥗', comida: { fome: 40, energia: 5 } },
  pipoca: { id: 'pipoca', nome: 'Pipoca', emoji: '🍿', comida: { fome: 15, diversao: 25 } },
}

export function sementeDoItem(id: string): Semente | null {
  if (id === 'semente-alface') return 'alface'
  if (id === 'semente-tomate') return 'tomate'
  if (id === 'semente-milho') return 'milho'
  return null
}

export type Inventario = Record<string, number>

export function quantidade(inv: Inventario, id: string): number {
  return inv[id] ?? 0
}

export function adicionar(inv: Inventario, id: string, qtd = 1): Inventario {
  return { ...inv, [id]: Math.min(999, quantidade(inv, id) + qtd) }
}

/** Tira do inventário; sem o suficiente, devolve `null` (nada muda). */
export function remover(inv: Inventario, id: string, qtd = 1): Inventario | null {
  const tem = quantidade(inv, id)
  if (tem < qtd) return null
  const novo = { ...inv }
  if (tem === qtd) delete novo[id]
  else novo[id] = tem - qtd
  return novo
}

/** Itens conhecidos com quantidade, na ordem do catálogo (o que o HUD mostra). */
export function itensVisiveis(inv: Inventario): { item: Item; qtd: number }[] {
  return Object.values(ITENS)
    .map((item) => ({ item, qtd: quantidade(inv, item.id) }))
    .filter((x) => x.qtd > 0)
}
