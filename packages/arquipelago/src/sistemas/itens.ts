import { adicionarAoInventario, type Semente } from '@sistemazero/arquipelago-contracts'
import { LEMBRANCAS_DA_PRAIA } from './colecoes-da-praia'
import { LEMBRANCAS_DAS_ILHAS } from './colecoes-das-ilhas'

/** Os itens do jogo. O inventário guarda `id → quantidade`; id desconhecido é ignorado. */
export interface Item {
  id: string
  nome: string
  emoji: string
  /** Se dá para comer: quanto repõe de cada necessidade. */
  comida?: { fome: number; diversao?: number; energia?: number }
  /** Se é coisa de usar (os patins): não se come nem se dá de presente. */
  equipamento?: true
  /**
   * Uma lembrança achada uma vez só (o cristal rosa da caverna do Pico): fica na mochila, não se
   * come nem se dá de presente. Dar de presente a devolveria ao lugar dela, para pegar de novo.
   */
  lembranca?: true
  /** Isca de pesca (`iscas.ts`): escolhida na mochila, gasta só quando um peixe vem. */
  isca?: true
  /** Coleção consultada no álbum, com um único atalho na barra da mochila. */
  colecao?: 'praia' | 'pico' | 'nuvens'
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
  'salada-do-carnaval': {
    id: 'salada-do-carnaval',
    nome: 'Salada do Carnaval',
    emoji: '🥗',
    comida: { fome: 30, diversao: 20 },
  },
  'milho-da-fogueira': {
    id: 'milho-da-fogueira',
    nome: 'Milho da fogueira',
    emoji: '🌽',
    comida: { fome: 20, diversao: 20 },
  },
  'pipoca-de-festa': {
    id: 'pipoca-de-festa',
    nome: 'Pipoca de festa',
    emoji: '🍿',
    comida: { fome: 15, diversao: 30 },
  },
  // Os ingredientes das receitas do Bento (fase2-04): vêm da despensa da padaria, não se comem.
  fuba: { id: 'fuba', nome: 'Fubá', emoji: '🌾' },
  leite: { id: 'leite', nome: 'Leite', emoji: '🥛' },
  ovo: { id: 'ovo', nome: 'Ovo', emoji: '🥚' },
  polvilho: { id: 'polvilho', nome: 'Polvilho', emoji: '🫙' },
  queijo: { id: 'queijo', nome: 'Queijo', emoji: '🧀' },
  cacau: { id: 'cacau', nome: 'Cacau', emoji: '🫘' },
  'leite-de-coco': { id: 'leite-de-coco', nome: 'Leite de coco', emoji: '🥥' },
  'polpa-de-acai': { id: 'polpa-de-acai', nome: 'Polpa de açaí', emoji: '🫐' },
  'moqueca-de-legumes': {
    id: 'moqueca-de-legumes',
    nome: 'Moqueca de legumes',
    emoji: '🍲',
    comida: { fome: 55, energia: 10 },
  },
  'acai-na-tigela': {
    id: 'acai-na-tigela',
    nome: 'Açaí na tigela',
    emoji: '🥣',
    comida: { fome: 25, energia: 15 },
  },
  'mingau-de-milho': {
    id: 'mingau-de-milho',
    nome: 'Mingau de milho',
    emoji: '🥣',
    comida: { fome: 35, energia: 10 },
  },
  canjica: { id: 'canjica', nome: 'Canjica', emoji: '🥣', comida: { fome: 35, diversao: 10 } },
  'salada-colorida': {
    id: 'salada-colorida',
    nome: 'Salada colorida',
    emoji: '🥗',
    comida: { fome: 55, energia: 15 },
  },
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
  // O cristal raro da caverna do Pico (fase3-07, `sistemas/cristal-raro.ts`).
  // Desde 30/10/2026 é também uma das quatro peças da coleção de cristais do Pico.
  'cristal-rosa': {
    id: 'cristal-rosa',
    nome: 'Cristal rosa',
    emoji: '💎',
    lembranca: true,
    colecao: 'pico',
  },
  // As iscas da pesca (30/10/2026, `sistemas/iscas.ts`).
  'isca-minhoca': { id: 'isca-minhoca', nome: 'Minhoca', emoji: '🪱', isca: true },
  'isca-pena': { id: 'isca-pena', nome: 'Isca de penas', emoji: '🪶', isca: true },
  // O presente do Floco no festival de inverno (fase3-09, `sistemas/planador.ts`).
  planador: { id: 'planador', nome: 'Planador', emoji: '🪁', equipamento: true },
  // Preserva a prioridade dos alimentos, sementes e equipamentos na barra existente.
  ...Object.fromEntries(
    LEMBRANCAS_DA_PRAIA.map(({ id, nome, emoji }): [string, Item] => [
      id,
      { id, nome, emoji, lembranca: true, colecao: 'praia' },
    ]),
  ),
  // As notas e os cristais do Pico e as estrelas das Nuvens (`colecoes-das-ilhas.ts`).
  ...Object.fromEntries(
    LEMBRANCAS_DAS_ILHAS.filter(({ id }) => id !== 'cristal-rosa').map(
      ({ id, nome, emoji, ilha }): [string, Item] => [
        id,
        { id, nome, emoji, lembranca: true, colecao: ilha },
      ],
    ),
  ),
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
  return adicionarAoInventario(inv, id, qtd)
}

/** Recompensa indivisível: não anunciar nem marcar uma entrega parcialmente truncada. */
export function adicionarConjunto(
  inv: Inventario,
  itens: Readonly<Record<string, number>>,
): Inventario | null {
  if (
    Object.entries(itens).some(
      ([id, q]) => !Number.isInteger(q) || q < 0 || (inv[id] ?? 0) + q > 999,
    )
  )
    return null
  let novo = inv
  for (const [id, q] of Object.entries(itens)) if (q > 0) novo = adicionar(novo, id, q)
  return novo
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

/** Quantas descobertas as coleções têm ao todo (praia, Pico e Nuvens). */
export const TOTAL_DE_DESCOBERTAS = Object.values(ITENS).filter((i) => i.colecao).length

/**
 * A barra é para uso rápido. As lembranças das coleções (as da praia, as do Pico e as das Nuvens)
 * não viram um espaço cada sobre o jogo: viram um botão só, que abre o álbum.
 */
export function itensDaBarra(inv: Inventario) {
  const visiveis = itensVisiveis(inv)
  return {
    itens: visiveis.filter(({ item }) => !item.colecao),
    descobertas: visiveis.filter(({ item }) => item.colecao).length,
    totalDeDescobertas: TOTAL_DE_DESCOBERTAS,
  }
}

/** O que dá para dar de presente (tudo da mochila menos equipamentos, iscas e lembranças). */
export function itensParaDar(inv: Inventario): { item: Item; qtd: number }[] {
  return itensVisiveis(inv).filter(({ item }) => !item.equipamento && !item.lembranca && !item.isca)
}
