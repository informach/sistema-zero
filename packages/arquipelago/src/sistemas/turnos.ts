import type { PostoDaVila, Salvamento } from '@sistemazero/arquipelago-contracts'
import { ajudarOBento } from './conversa-do-bento'
import { adicionar, ITENS } from './itens'
import { sorteio } from './moradores'

/**
 * Os turnos nos balcões da Vila Doce (fase2-03), profissão de mentirinha: seis fregueses pedem,
 * um de cada vez, e ela monta a bandeja com o que cada um pediu. Errar não tira nada: o freguês
 * repete o pedido e ela tenta de novo. O primeiro turno do dia em cada balcão paga em
 * ingredientes e sementes (moedas, só quando o serviço autorizar). Sem React: o painel é
 * `interface/turno.tsx`.
 */

export interface Produto {
  id: string
  /** O nome no botão do balcão. */
  nome: string
  emoji: string
  /** Como o freguês fala um e mais de um (`um sonho`, `dois sonhos`). */
  um: string
  varios: string
  genero: 'm' | 'f'
}

export interface Balcao {
  posto: PostoDaVila
  /** O título do painel. */
  titulo: string
  /** A primeira fala do turno. */
  convite: string
  produtos: readonly Produto[]
  /** O pagamento do primeiro turno do dia (itens do inventário). */
  pagamento: Readonly<Record<string, number>>
  /** Quem paga, na fala do fim (`A sorveteria paga`). */
  quemPaga: string
}

export const BALCOES: Readonly<Record<PostoDaVila, Balcao>> = {
  padaria: {
    posto: 'padaria',
    titulo: 'Turno na padaria',
    convite:
      'O Bento cuida do forno e você cuida do balcão. Monte a bandeja com o que cada freguês pedir.',
    produtos: [
      {
        id: 'pao-frances',
        nome: 'Pão francês',
        emoji: '🥖',
        um: 'pão francês',
        varios: 'pães franceses',
        genero: 'm',
      },
      {
        id: 'pao-de-queijo',
        nome: 'Pão de queijo',
        emoji: '🧀',
        um: 'pão de queijo',
        varios: 'pães de queijo',
        genero: 'm',
      },
      {
        id: 'bolo',
        nome: 'Bolo de fubá',
        emoji: '🍰',
        um: 'fatia de bolo de fubá',
        varios: 'fatias de bolo de fubá',
        genero: 'f',
      },
      { id: 'sonho', nome: 'Sonho', emoji: '🍩', um: 'sonho', varios: 'sonhos', genero: 'm' },
    ],
    pagamento: { fuba: 1, leite: 1, ovo: 1 },
    quemPaga: 'O Bento paga',
  },
  sorveteria: {
    posto: 'sorveteria',
    titulo: 'Turno na sorveteria',
    convite: 'A fila da sorveteria já começou. Cada bola vai do sabor que o freguês pedir.',
    produtos: [
      {
        id: 'morango',
        nome: 'Morango',
        emoji: '🍓',
        um: 'bola de morango',
        varios: 'bolas de morango',
        genero: 'f',
      },
      {
        id: 'chocolate',
        nome: 'Chocolate',
        emoji: '🍫',
        um: 'bola de chocolate',
        varios: 'bolas de chocolate',
        genero: 'f',
      },
      {
        id: 'coco',
        nome: 'Coco',
        emoji: '🥥',
        um: 'bola de coco',
        varios: 'bolas de coco',
        genero: 'f',
      },
      {
        id: 'milho',
        nome: 'Milho',
        emoji: '🌽',
        um: 'bola de milho',
        varios: 'bolas de milho',
        genero: 'f',
      },
    ],
    pagamento: { cacau: 1, leite: 1 },
    quemPaga: 'A sorveteria paga',
  },
  sucos: {
    posto: 'sucos',
    titulo: 'Turno na barraca de sucos',
    convite: 'Hoje a barraca de sucos da feira é sua. Cada copo sai da fruta que o freguês pedir.',
    produtos: [
      {
        id: 'laranja',
        nome: 'Laranja',
        emoji: '🍊',
        um: 'suco de laranja',
        varios: 'sucos de laranja',
        genero: 'm',
      },
      {
        id: 'uva',
        nome: 'Uva',
        emoji: '🍇',
        um: 'suco de uva',
        varios: 'sucos de uva',
        genero: 'm',
      },
      {
        id: 'melancia',
        nome: 'Melancia',
        emoji: '🍉',
        um: 'suco de melancia',
        varios: 'sucos de melancia',
        genero: 'm',
      },
      {
        id: 'abacaxi',
        nome: 'Abacaxi',
        emoji: '🍍',
        um: 'suco de abacaxi',
        varios: 'sucos de abacaxi',
        genero: 'm',
      },
    ],
    pagamento: { 'semente-tomate': 1, 'semente-milho': 1 },
    quemPaga: 'A barraca paga',
  },
}

/** Quantos fregueses tem um turno e quantas coisas cada um pede (o turno fica mais difícil no fim). */
export const TAMANHO_DOS_PEDIDOS = [1, 1, 2, 2, 3, 3] as const
/** O máximo na bandeja (dá para errar para mais, mas não encher sem fim). */
export const MAXIMO_NA_BANDEJA = 5

/** Quem vem ao balcão: moradores e Lumis do arquipélago (sete, para os seis serem diferentes). */
export const FREGUESES = ['Nico', 'Jade', 'Iriê', 'Floco', 'Maré', 'Estrelinha', 'Búzio'] as const

const ABERTURAS = ['Eu queria', 'Vou querer', 'Me vê'] as const
const AGRADECIMENTOS = [
  'Era isso mesmo. Obrigado pelo capricho.',
  'Perfeito. Até a próxima.',
  'Que delícia. Volto amanhã.',
  'Isso mesmo, valeu.',
] as const

export interface Pedido {
  quem: string
  itens: Readonly<Record<string, number>>
}

export interface TurnoEmAndamento {
  posto: PostoDaVila
  pedidos: readonly Pedido[]
  /** O freguês da vez (igual ao número de pedidos quando o turno acabou). */
  atual: number
  bandeja: Readonly<Record<string, number>>
  erros: number
}

/** Os seis pedidos de um turno, iguais para o mesmo balcão, dia e número do turno. */
export function pedidosDoTurno(posto: PostoDaVila, dia: string, vez: number): Pedido[] {
  const base = `turno:${posto}:${dia}:${vez}`
  const produtos = BALCOES[posto].produtos
  const primeiro = sorteio(`${base}:quem`) % FREGUESES.length
  return TAMANHO_DOS_PEDIDOS.map((tamanho, i) => {
    const itens: Record<string, number> = {}
    for (let k = 0; k < tamanho; k++) {
      const p = produtos[sorteio(`${base}:${i}:${k}`) % produtos.length]
      if (p) itens[p.id] = (itens[p.id] ?? 0) + 1
    }
    return { quem: FREGUESES[(primeiro + i) % FREGUESES.length] ?? 'Nico', itens }
  })
}

/** Começar um turno: `vez` é quantos turnos ela já fez ali (cada turno tem fregueses novos). */
export function comecarTurno(posto: PostoDaVila, dia: string, vez: number): TurnoEmAndamento {
  return { posto, pedidos: pedidosDoTurno(posto, dia, vez), atual: 0, bandeja: {}, erros: 0 }
}

export function produtoDoBalcao(posto: PostoDaVila, id: string): Produto | null {
  return BALCOES[posto].produtos.find((p) => p.id === id) ?? null
}

const NUMEROS: Readonly<Record<number, { m: string; f: string }>> = {
  1: { m: 'um', f: 'uma' },
  2: { m: 'dois', f: 'duas' },
  3: { m: 'três', f: 'três' },
  4: { m: 'quatro', f: 'quatro' },
  5: { m: 'cinco', f: 'cinco' },
}

/** `dois pães de queijo e um sonho`, na ordem dos produtos do balcão. */
export function itensPorExtenso(
  posto: PostoDaVila,
  itens: Readonly<Record<string, number>>,
): string {
  const partes: string[] = []
  for (const p of BALCOES[posto].produtos) {
    const q = itens[p.id] ?? 0
    if (q <= 0) continue
    const n = NUMEROS[q]?.[p.genero] ?? String(q)
    partes.push(`${n} ${q === 1 ? p.um : p.varios}`)
  }
  if (partes.length <= 1) return partes[0] ?? ''
  return `${partes.slice(0, -1).join(', ')} e ${partes.at(-1)}`
}

export function pedidoDaVez(t: TurnoEmAndamento): Pedido | null {
  return t.pedidos[t.atual] ?? null
}

/** O que o freguês da vez fala ao chegar no balcão. */
export function falaDoPedido(t: TurnoEmAndamento): string {
  const p = pedidoDaVez(t)
  if (!p) return ''
  const abertura = ABERTURAS[sorteio(`abre:${t.atual}:${p.quem}`) % ABERTURAS.length]
  return `${abertura} ${itensPorExtenso(t.posto, p.itens)}, por favor.`
}

export function totalNaBandeja(t: TurnoEmAndamento): number {
  return Object.values(t.bandeja).reduce((a, b) => a + b, 0)
}

/** Pôr um na bandeja (cheia, nada muda). */
export function porNaBandeja(t: TurnoEmAndamento, id: string): TurnoEmAndamento {
  if (!produtoDoBalcao(t.posto, id) || totalNaBandeja(t) >= MAXIMO_NA_BANDEJA || terminou(t))
    return t
  return { ...t, bandeja: { ...t.bandeja, [id]: (t.bandeja[id] ?? 0) + 1 } }
}

/** Tirar um da bandeja. */
export function tirarDaBandeja(t: TurnoEmAndamento, id: string): TurnoEmAndamento {
  const q = t.bandeja[id] ?? 0
  if (q <= 0) return t
  const bandeja = { ...t.bandeja }
  if (q === 1) delete bandeja[id]
  else bandeja[id] = q - 1
  return { ...t, bandeja }
}

function mesmosItens(a: Readonly<Record<string, number>>, b: Readonly<Record<string, number>>) {
  const ids = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const id of ids) if ((a[id] ?? 0) !== (b[id] ?? 0)) return false
  return true
}

export function terminou(t: TurnoEmAndamento): boolean {
  return t.atual >= t.pedidos.length
}

/**
 * Entregar a bandeja ao freguês da vez. Certo, vem o próximo; errado, conta um erro, a bandeja
 * esvazia e o mesmo freguês repete o pedido. Bandeja vazia não conta.
 */
export function entregarBandeja(t: TurnoEmAndamento): {
  turno: TurnoEmAndamento
  certo: boolean
  fala: string
} {
  const p = pedidoDaVez(t)
  if (!p) return { turno: t, certo: false, fala: '' }
  if (totalNaBandeja(t) === 0)
    return {
      turno: t,
      certo: false,
      fala: 'A bandeja ainda está vazia. Toque no que o freguês pediu.',
    }
  if (mesmosItens(t.bandeja, p.itens)) {
    const fala = AGRADECIMENTOS[sorteio(`obrigado:${t.atual}:${p.quem}`) % AGRADECIMENTOS.length]
    return { turno: { ...t, atual: t.atual + 1, bandeja: {} }, certo: true, fala: fala ?? '' }
  }
  return {
    turno: { ...t, bandeja: {}, erros: t.erros + 1 },
    certo: false,
    fala: `Não era bem isso. Eu pedi ${itensPorExtenso(t.posto, p.itens)}.`,
  }
}

/** As estrelas do turno: nenhum erro, 3; até dois, 2; mais, 1. */
export function estrelasDoTurno(erros: number): 1 | 2 | 3 {
  if (erros === 0) return 3
  return erros <= 2 ? 2 : 1
}

const nomeDoItem = (id: string) => ITENS[id]?.nome.toLowerCase() ?? id

function pagamentoPorExtenso(pagamento: Readonly<Record<string, number>>): string {
  const partes = Object.entries(pagamento).map(([id, q]) => `${q} ${nomeDoItem(id)}`)
  if (partes.length <= 1) return partes[0] ?? ''
  return `${partes.slice(0, -1).join(', ')} e ${partes.at(-1)}`
}

/** Já pagou hoje neste balcão. */
export function jaPagouHoje(s: Salvamento, posto: PostoDaVila, dia: string): boolean {
  return s.turnos[posto]?.pagoEm === dia
}

/**
 * Fechar um turno terminado: guarda as melhores estrelas e quantos turnos ela fez ali e, no
 * primeiro turno do dia do balcão, paga. Na padaria, esse turno também é amizade com o Bento (e
 * pode trazer uma receita nova, com as falas dele).
 */
export function fecharTurno(
  s: Salvamento,
  t: TurnoEmAndamento,
  dia: string,
): { salvamento: Salvamento; estrelas: 1 | 2 | 3; pagou: boolean; falas: string[] } | null {
  if (!terminou(t)) return null
  const balcao = BALCOES[t.posto]
  const estrelas = estrelasDoTurno(t.erros)
  const antes = s.turnos[t.posto]
  const pagou = antes?.pagoEm !== dia
  let salvamento: Salvamento = {
    ...s,
    turnos: {
      ...s.turnos,
      [t.posto]: {
        pagoEm: pagou ? dia : (antes?.pagoEm ?? null),
        melhor: Math.max(antes?.melhor ?? 1, estrelas),
        vezes: Math.min(9999, (antes?.vezes ?? 0) + 1),
      },
    },
  }
  if (!pagou)
    return {
      salvamento,
      estrelas,
      pagou,
      falas: ['O pagamento de hoje deste balcão já veio. Amanhã tem turno pago de novo.'],
    }
  let inventario = salvamento.inventario
  for (const [id, q] of Object.entries(balcao.pagamento)) inventario = adicionar(inventario, id, q)
  salvamento = { ...salvamento, inventario }
  const falas = [`${balcao.quemPaga} o turno com ${pagamentoPorExtenso(balcao.pagamento)}.`]
  if (t.posto === 'padaria') {
    const bento = ajudarOBento(salvamento, dia)
    salvamento = bento.salvamento
    falas.push(...bento.falas)
  }
  return { salvamento, estrelas, pagou, falas }
}
