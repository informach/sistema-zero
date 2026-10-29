import {
  type CartasDoJogador,
  CartasDoJogadorSchema,
  type TipoDeCarta,
} from '@sistemazero/arquipelago-contracts'

/**
 * O caderno dos Lumis (regra pura, sem React): a coleção de cartões da rotina, arrumada por tipo.
 * Quem tem cada cartão vem SEMPRE do serviço (`GET /cartas`: os do jogo para todos, os de controle
 * pelos blocos conquistados nos cursos, equipe com todos); aqui só se arruma para a tela. Montar a
 * rotina e o Lumi executar ficam para a Fase 2.
 */
export type CartaDoCaderno = CartasDoJogador['cartas'][number]

export interface SecaoDoCaderno {
  tipo: TipoDeCarta
  titulo: string
  explica: string
  cartas: CartaDoCaderno[]
  prontas: number
}

/** A ordem do caderno: quando a rotina começa, o que o Lumi faz, e como os cartões se repetem. */
const SECOES: readonly { tipo: TipoDeCarta; titulo: string; explica: string }[] = [
  { tipo: 'quando', titulo: 'Quando', explica: 'A hora em que a rotina começa.' },
  { tipo: 'acao', titulo: 'Ação', explica: 'O que o Lumi faz na ilha.' },
  {
    tipo: 'controle',
    titulo: 'Controle',
    explica: 'Os mesmos blocos do Estúdio. Cada um chega quando você aprende o bloco num curso.',
  },
]

/** As três seções na ordem, cada uma com os cartões na ordem do serviço (seção vazia sai). */
export function secoesDoCaderno(cartas: readonly CartaDoCaderno[]): SecaoDoCaderno[] {
  return SECOES.flatMap((s) => {
    const daSecao = cartas.filter((c) => c.tipo === s.tipo)
    if (daSecao.length === 0) return []
    return [{ ...s, cartas: daSecao, prontas: daSecao.filter((c) => c.conquistada).length }]
  })
}

/** Onde aprender um cartão que falta: o curso mais cedo (o serviço já manda em ordem). */
export function ondeAprender(carta: CartaDoCaderno): string | null {
  if (carta.conquistada) return null
  return carta.aprendaEm[0]?.titulo ?? null
}

/** A resposta do serviço conferida pelo contrato (formato estranho conta como indisponível). */
export function lerCartas(corpo: unknown): CartasDoJogador | null {
  const lido = CartasDoJogadorSchema.safeParse(corpo)
  return lido.success ? lido.data : null
}

/** Por que o caderno não abriu: sem acesso ao jogo (403) ou serviço e plataforma fora. */
export type MotivoDoCadernoFechado = 'sem-acesso' | 'fora-do-ar'

export function motivoDoCadernoFechado(status: number): MotivoDoCadernoFechado {
  return status === 403 ? 'sem-acesso' : 'fora-do-ar'
}
