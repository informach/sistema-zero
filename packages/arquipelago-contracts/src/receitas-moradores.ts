import { AMIZADE_MAXIMA } from './salvamento'

export type MoradorDoAnel = 'mare' | 'floco' | 'jade' | 'irie'
const coracoes = (amizade: number) => Math.min(AMIZADE_MAXIMA / 100, Math.floor(amizade / 100))

/** Onde a receita se faz: a bancada da ilha (fogão e pia) ou o forno da casa (projeto azul). */
export type LugarDaReceita = 'bancada' | 'forno' | 'fogueira'
export type OrigemDaReceita =
  | { tipo: 'inicio' }
  | { tipo: 'amizade'; morador: 'bento' | MoradorDoAnel; coracoes: number }
  | { tipo: 'colecao'; colecao: 'bichos-do-bosque' }
  | { tipo: 'festa'; festa: 'junina' | 'carnaval' | 'fim-de-ano' }

export interface Receita {
  id: string
  nome: string
  precisa: Record<string, number>
  faz: { id: string; qtd: number }
  onde: LugarDaReceita
  origem: OrigemDaReceita
}

/**
 * As receitas. A salada e a pipoca já se sabem; as da Vila Doce o Bento lembra conforme a amizade
 * (fase2-04): o bolo de fubá com um coração, o pão de queijo com dois, o brigadeiro com três e o
 * chocolate quente com quatro.
 */
export const RECEITAS: Receita[] = [
  {
    id: 'salada-do-carnaval',
    nome: 'Salada do Carnaval',
    precisa: { alface: 1, tomate: 1, milho: 1 },
    faz: { id: 'salada-do-carnaval', qtd: 1 },
    onde: 'bancada',
    origem: { tipo: 'festa', festa: 'carnaval' },
  },
  {
    id: 'milho-da-fogueira',
    nome: 'Milho da fogueira',
    precisa: { milho: 1 },
    faz: { id: 'milho-da-fogueira', qtd: 1 },
    onde: 'fogueira',
    origem: { tipo: 'festa', festa: 'junina' },
  },
  {
    id: 'pipoca-de-festa',
    nome: 'Pipoca de festa',
    precisa: { milho: 1 },
    faz: { id: 'pipoca-de-festa', qtd: 1 },
    onde: 'fogueira',
    origem: { tipo: 'festa', festa: 'junina' },
  },
  {
    // A sobremesa da festa de fim de ano (aprovada pela dona em 30/10/2026: 20/12 a 06/01).
    id: 'manjar-de-coco',
    nome: 'Manjar de coco',
    precisa: { 'leite-de-coco': 1, leite: 2 },
    faz: { id: 'manjar-de-coco', qtd: 1 },
    onde: 'bancada',
    origem: { tipo: 'festa', festa: 'fim-de-ano' },
  },
  {
    id: 'salada',
    nome: 'Salada da horta',
    precisa: { alface: 1, tomate: 1 },
    faz: { id: 'salada', qtd: 1 },
    onde: 'bancada',
    origem: { tipo: 'inicio' },
  },
  {
    id: 'pipoca',
    nome: 'Pipoca',
    precisa: { milho: 1 },
    faz: { id: 'pipoca', qtd: 2 },
    onde: 'bancada',
    origem: { tipo: 'inicio' },
  },
  {
    id: 'bolo-de-fuba',
    nome: 'Bolo de fubá',
    precisa: { fuba: 1, leite: 1, ovo: 1 },
    faz: { id: 'bolo-de-fuba', qtd: 1 },
    onde: 'forno',
    origem: { tipo: 'amizade', morador: 'bento', coracoes: 1 },
  },
  {
    id: 'pao-de-queijo',
    nome: 'Pão de queijo',
    precisa: { polvilho: 1, queijo: 1 },
    faz: { id: 'pao-de-queijo', qtd: 3 },
    onde: 'forno',
    origem: { tipo: 'amizade', morador: 'bento', coracoes: 2 },
  },
  {
    id: 'brigadeiro',
    nome: 'Brigadeiro',
    precisa: { cacau: 1, leite: 2 },
    faz: { id: 'brigadeiro', qtd: 4 },
    onde: 'bancada',
    origem: { tipo: 'amizade', morador: 'bento', coracoes: 3 },
  },
  {
    id: 'chocolate-quente',
    nome: 'Chocolate quente',
    precisa: { cacau: 1, leite: 1 },
    faz: { id: 'chocolate-quente', qtd: 1 },
    onde: 'bancada',
    origem: { tipo: 'amizade', morador: 'bento', coracoes: 4 },
  },
  {
    // A receita da Maré é a da proposta (§6.28, A6): peixe, coco e limão, no fogão da bancada. A
    // cesta dela traz os três; a pesca continua devolvendo o peixe ao mar.
    id: 'peixe-com-coco',
    nome: 'Peixe com coco',
    precisa: { peixe: 1, coco: 1, limao: 1 },
    faz: { id: 'peixe-com-coco', qtd: 1 },
    onde: 'bancada',
    origem: { tipo: 'amizade', morador: 'mare', coracoes: 1 },
  },
  {
    id: 'acai-na-tigela',
    nome: 'Açaí na tigela',
    precisa: { 'polpa-de-acai': 1 },
    faz: { id: 'acai-na-tigela', qtd: 1 },
    onde: 'bancada',
    origem: { tipo: 'amizade', morador: 'jade', coracoes: 1 },
  },
  {
    id: 'mingau-de-milho',
    nome: 'Mingau de milho',
    precisa: { fuba: 1, leite: 1 },
    faz: { id: 'mingau-de-milho', qtd: 1 },
    onde: 'bancada',
    origem: { tipo: 'amizade', morador: 'floco', coracoes: 1 },
  },
  {
    id: 'canjica',
    nome: 'Canjica',
    precisa: { milho: 2, leite: 1 },
    faz: { id: 'canjica', qtd: 1 },
    onde: 'bancada',
    origem: { tipo: 'amizade', morador: 'irie', coracoes: 1 },
  },
  {
    id: 'salada-colorida',
    nome: 'Salada colorida',
    precisa: { alface: 2, tomate: 2, milho: 1 },
    faz: { id: 'salada-colorida', qtd: 1 },
    onde: 'bancada',
    origem: { tipo: 'colecao', colecao: 'bichos-do-bosque' },
  },
]

/** Somente receitas deste morador. É usada para anúncio e cesta, sem segunda régua de desbloqueio. */
export function receitasDoMorador(quem: 'bento' | MoradorDoAnel, amizade: number): Receita[] {
  return RECEITAS.filter(
    (r) =>
      r.origem.tipo === 'amizade' &&
      r.origem.morador === quem &&
      r.origem.coracoes <= coracoes(amizade),
  )
}

export function receitasNovasDoMorador(
  quem: 'bento' | MoradorDoAnel,
  antes: number,
  depois: number,
): Receita[] {
  const conhecidas = new Set(receitasDoMorador(quem, antes).map((r) => r.id))
  return receitasDoMorador(quem, depois).filter((r) => !conhecidas.has(r.id))
}

/** Uma cesta por pedido. Os ingredientes cultiváveis continuam vindo da horta. */
export function cestaDoMorador(quem: MoradorDoAnel, amizade: number): Record<string, number> {
  const cesta: Record<string, number> = {}
  for (const r of receitasDoMorador(quem, amizade))
    for (const [id, qtd] of Object.entries(r.precisa))
      if (!['alface', 'tomate', 'milho'].includes(id)) cesta[id] = (cesta[id] ?? 0) + qtd
  return cesta
}
