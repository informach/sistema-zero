/**
 * Os cartões da rotina dos Lumis: "blocos com outra roupa" (projeto do jogo). A criança monta a
 * rotina de um Lumi com cartões; os cartões de CONTROLE (repetir, para cada, se, guardar na memória)
 * são os mesmos conceitos dos blocos do Estúdio e só aparecem para quem conquistou o bloco num
 * curso (decisão de 27/10/2026). Os de AÇÃO e de QUANDO são do mundo do jogo e valem para todos.
 *
 * Catálogo no código, não no Admin: o que cada cartão faz na rotina é código do jogo. O bloco de
 * cada cartão precisa existir no catálogo do Estúdio (teste no Members, que lê este arquivo).
 * Sem import nenhum de propósito: o teste do Members o importa pelo caminho.
 */

export type TipoDeCarta = 'quando' | 'acao' | 'controle'

export interface CartaLumi {
  id: string
  nome: string
  tipo: TipoDeCarta
  /** O bloco do Estúdio que libera o cartão; `null` = cartão do jogo, sempre disponível. */
  bloco: string | null
  /** O que o cartão faz na rotina, no vocabulário da criança. */
  efeito: string
}

export const CARTAS_LUMI: readonly CartaLumi[] = [
  {
    id: 'quando-amanhecer',
    nome: 'Quando amanhecer',
    tipo: 'quando',
    bloco: null,
    efeito: 'Começa a rotina quando o dia nasce.',
  },
  {
    id: 'quando-anoitecer',
    nome: 'Quando anoitecer',
    tipo: 'quando',
    bloco: null,
    efeito: 'Começa a rotina quando a noite chega.',
  },
  {
    id: 'voar-ate',
    nome: 'Voar até',
    tipo: 'acao',
    bloco: null,
    efeito: 'O Lumi voa até um lugar da ilha.',
  },
  {
    id: 'regar',
    nome: 'Regar',
    tipo: 'acao',
    bloco: null,
    efeito: 'Rega o canteiro em que o Lumi está.',
  },
  {
    id: 'colher',
    nome: 'Colher',
    tipo: 'acao',
    bloco: null,
    efeito: 'Colhe o que está maduro no canteiro.',
  },
  {
    id: 'guardar',
    nome: 'Guardar tudo',
    tipo: 'acao',
    bloco: null,
    efeito: 'Guarda o que o Lumi carrega.',
  },
  {
    id: 'repetir',
    nome: 'Repetir',
    tipo: 'controle',
    bloco: 'sz_js_repeat',
    efeito: 'Faz os cartões de dentro algumas vezes.',
  },
  {
    id: 'para-cada',
    nome: 'Para cada',
    tipo: 'controle',
    bloco: 'sz_js_for_each',
    efeito: 'Faz os cartões de dentro em cada canteiro, um de cada vez.',
  },
  {
    id: 'enquanto',
    nome: 'Enquanto',
    tipo: 'controle',
    bloco: 'sz_js_while',
    efeito: 'Continua fazendo enquanto a condição valer.',
  },
  {
    id: 'se',
    nome: 'Se',
    tipo: 'controle',
    bloco: 'sz_js_if_else',
    efeito: 'Só faz os cartões de dentro quando a condição valer.',
  },
  {
    id: 'escolha',
    nome: 'Escolha',
    tipo: 'controle',
    bloco: 'sz_js_switch',
    efeito: 'Faz uma coisa diferente para cada caso.',
  },
  {
    id: 'esperar',
    nome: 'Esperar',
    tipo: 'controle',
    bloco: 'sz_js_set_timeout_seconds',
    efeito: 'Espera alguns segundos antes do próximo cartão.',
  },
  {
    id: 'guardar-na-memoria',
    nome: 'Guardar na memória',
    tipo: 'controle',
    bloco: 'sz_js_var_create',
    efeito: 'O Lumi lembra de um número ou de uma palavra.',
  },
  {
    id: 'contar',
    nome: 'Contar mais um',
    tipo: 'controle',
    bloco: 'sz_js_var_increment',
    efeito: 'Soma um ao que o Lumi lembra.',
  },
]

/** O cartão está na mão de quem tem estes blocos? (Equipe vê tudo: passe `todos`.) */
export function cartaConquistada(carta: CartaLumi, blocos: ReadonlySet<string> | 'todos'): boolean {
  return carta.bloco === null || blocos === 'todos' || blocos.has(carta.bloco)
}
