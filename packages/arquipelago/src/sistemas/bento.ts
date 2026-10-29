import type { Morador } from '@sistemazero/arquipelago-contracts'
import type { Aniversario, Gostos, PedidoDeMorador } from './moradores'
import { sorteio } from './moradores'

/**
 * O Bento, o tamanduá confeiteiro da Vila Doce (fase2-02, regras puras). A amizade usa as mesmas
 * contas da Capi (`moradores.ts`); aqui ficam os gostos, o aniversário, os pedidos e onde ele fica.
 * Ele esqueceu as receitas quando a cor foi embora e quer tentar de novo com o que a horta dá.
 */

/** 24 de junho, dia de São João: festa de milho e bolo de fubá. O presente vale o dobro. */
export const ANIVERSARIO_DO_BENTO: Aniversario = { mes: 6, dia: 24 }

/** Milho (o fubá do bolo) e pipoca são os preferidos; o resto da horta é comum. */
export const GOSTOS_DO_BENTO: Gostos = {
  milho: 'gosta',
  pipoca: 'gosta',
  salada: 'comum',
  alface: 'comum',
  tomate: 'comum',
}

/** Os pedidos do dia: o que ele precisa para tentar lembrar as receitas e abrir a padaria. */
export const PEDIDOS_DO_BENTO: readonly PedidoDeMorador[] = [
  { id: 'milho-2', texto: 'Dois milhos da horta, para o fubá do bolo', itens: { milho: 2 } },
  { id: 'milho-1', texto: 'Um milho para provar uma receita', itens: { milho: 1 } },
  { id: 'pipoca-2', texto: 'Duas pipocas para a feira', itens: { pipoca: 2 } },
  { id: 'salada-1', texto: 'Uma salada para o almoço da padaria', itens: { salada: 1 } },
  { id: 'tomate-2', texto: 'Dois tomates para o molho do pão', itens: { tomate: 2 } },
]

export function pedidoDoBentoPeloId(id: string): PedidoDeMorador | null {
  return PEDIDOS_DO_BENTO.find((p) => p.id === id) ?? null
}

/**
 * O pedido de hoje: o guardado, se for de hoje; senão um novo, sorteado pelo dia e pelo perfil (o
 * mesmo o dia inteiro em qualquer aparelho, e diferente do sorteio da Capi).
 */
export function pedidoDoDiaDoBento(bento: Morador, dia: string, perfilId: string): Morador {
  if (bento.pedido?.dia === dia) return bento
  const i = sorteio(`bento:${perfilId}:${dia}`) % PEDIDOS_DO_BENTO.length
  const id = PEDIDOS_DO_BENTO[i]?.id ?? 'milho-1'
  return { ...bento, pedido: { dia, id, entregue: false } }
}

export const BENTO_NA_VILA = {
  /** A esta distância (no chão) ele se vira para a criança; mais longe, olha para a praça. */
  olharDe: 7,
  /** De que distância aparece "Conversar com o Bento". */
  alcance: 2.2,
  /** Ele acena quando a criança chega perto, no máximo uma vez a cada tanto (s). */
  acenoACada: 45,
  /** Quão rápido ele se vira (maior, mais rápido). */
  rapidezDoGiro: 3,
  /** O corpo que segura a criança (raio e altura do cilindro; o chapéu passa um pouco). */
  raio: 0.45,
  altura: 1.6,
  /** Da âncora (os pés) até o meio da cabeça, para a câmera da conversa. */
  alturaDaCabeca: 1.4,
} as const

// ── O que ele fala ──────────────────────────────────────────────────────────────────────────────

export interface ContextoDaFalaDoBento {
  /** Corações cheios (0 a 5). */
  coracoes: number
  primeiroEncontro: boolean
  primeiraDoDia: boolean
  aniversario: boolean
  /** O texto do pedido de hoje, se ainda não foi entregue. */
  pedido: string | null
}

const PRIMEIRO_ENCONTRO = [
  'Bom dia. Eu sou o Bento, o confeiteiro da Vila Doce.',
  'Quando a cor foi embora, eu esqueci as minhas receitas. Até o bolo de fubá, que eu fazia de olhos fechados.',
  'Se você me trouxer umas coisas da horta, eu tento lembrar. Cada dia eu peço uma.',
]

/** Duas falas por nível de amizade (o índice é o número de corações). */
const POR_NIVEL: readonly (readonly string[])[] = [
  [
    'A feira está quieta, mas o cheiro de fermento ainda mora aqui.',
    'Eu varro a padaria todo dia, para quando a vontade de assar voltar.',
  ],
  [
    'Hoje eu lembrei que o bolo de fubá leva ovo. Já é um começo.',
    'Você tem mão boa para a horta. Dá para ver pelo milho.',
  ],
  [
    'A Íris vinha aqui provar tudo antes de todo mundo. Ela dizia que era para ajudar.',
    'Uma receita é como um mapa: se a gente esquece um pedaço, o resto ajuda a lembrar.',
  ],
  [
    'Ontem eu sonhei com o forno cheio. Acordei com a farinha no nariz.',
    'Quando a sorveteria abria, a praça inteira cheirava a baunilha.',
  ],
  [
    'Com você por perto, as receitas voltam mais depressa.',
    'Eu guardei a melhor mesa da padaria para você. É a da janela.',
  ],
  [
    'Você virou parte da Vila Doce. O sino da padaria toca diferente quando você chega.',
    'Se as receitas sumirem de novo, eu sei que a gente lembra junto.',
  ],
]

const DESPEDIDA = [
  'Até amanhã. Vou tentar lembrar mais uma receita.',
  'Volte amanhã, que o forno terá novidade.',
]

function uma(grupo: readonly string[], escolha: number): string {
  return grupo[Math.abs(escolha) % grupo.length] ?? grupo[0] ?? ''
}

/** As falas desta conversa, na ordem (`escolha` muda a fala dentro do nível, pelo dia). */
export function falasDoBento(c: ContextoDaFalaDoBento, escolha: number): string[] {
  if (c.primeiroEncontro)
    return c.pedido
      ? [...PRIMEIRO_ENCONTRO, `Hoje eu queria uma coisa: ${c.pedido.toLowerCase()}.`]
      : [...PRIMEIRO_ENCONTRO]
  if (!c.primeiraDoDia) return [uma(DESPEDIDA, escolha)]
  const falas: string[] = []
  if (c.aniversario)
    falas.push('Hoje é o meu aniversário, dia de São João. Vir me ver já é um presente.')
  falas.push(uma(POR_NIVEL[Math.min(5, Math.max(0, c.coracoes))] ?? POR_NIVEL[0] ?? [], escolha))
  if (c.pedido) falas.push(`Hoje eu queria uma coisa: ${c.pedido.toLowerCase()}.`)
  return falas
}
