import type { Semente } from '@sistemazero/arquipelago-contracts'

/** Os itens do jogo. O inventário guarda `id → quantidade`; id desconhecido é ignorado. */
export interface Item {
  id: string
  nome: string
  emoji: string
  /** Se dá para comer: quanto repõe de cada necessidade. */
  comida?: { fome: number; diversao?: number; energia?: number }
  /** Se é coisa de usar (os patins): não se come nem se dá de presente. */
  equipamento?: true
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
  // Os ingredientes das receitas do Bento (fase2-04): vêm da despensa da padaria, não se comem.
  fuba: { id: 'fuba', nome: 'Fubá', emoji: '🌾' },
  leite: { id: 'leite', nome: 'Leite', emoji: '🥛' },
  ovo: { id: 'ovo', nome: 'Ovo', emoji: '🥚' },
  polvilho: { id: 'polvilho', nome: 'Polvilho', emoji: '🫙' },
  queijo: { id: 'queijo', nome: 'Queijo', emoji: '🧀' },
  cacau: { id: 'cacau', nome: 'Cacau', emoji: '🫘' },
  // O que sai do forno e da bancada com as receitas do Bento.
  'bolo-de-fuba': {
    id: 'bolo-de-fuba',
    nome: 'Bolo de fubá',
    emoji: '🍰',
    comida: { fome: 50 },
  },
  'pao-de-queijo': {
    id: 'pao-de-queijo',
    nome: 'Pão de queijo',
    emoji: '🥯',
    comida: { fome: 30 },
  },
  brigadeiro: {
    id: 'brigadeiro',
    nome: 'Brigadeiro',
    emoji: '🍫',
    comida: { fome: 10, diversao: 20 },
  },
  'chocolate-quente': {
    id: 'chocolate-quente',
    nome: 'Chocolate quente',
    emoji: '☕',
    comida: { fome: 15, energia: 15 },
  },
  // O prêmio da entrega pelos telhados (fase2-05, `sistemas/patins.ts`).
  patins: { id: 'patins', nome: 'Patins', emoji: '🛼', equipamento: true },
  // O presente do Bento para prender os borrões (fase2-06, `sistemas/borroes.ts`).
  lanterna: { id: 'lanterna', nome: 'Lanterna', emoji: '🏮', equipamento: true },
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

/** O que dá para dar de presente (tudo da mochila menos os equipamentos). */
export function itensParaDar(inv: Inventario): { item: Item; qtd: number }[] {
  return itensVisiveis(inv).filter(({ item }) => !item.equipamento)
}
