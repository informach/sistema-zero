/**
 * Os cartões da rotina dos Lumis: "blocos com outra roupa" (projeto do jogo). A criança monta a
 * rotina de um Lumi com cartões; os cartões de CONTROLE (repetir, para cada, se, guardar na memória)
 * são os mesmos conceitos dos blocos do Estúdio. Os de AÇÃO e de QUANDO são do mundo do jogo.
 *
 * Os cartões chegam pelo POSTO da Jornada, como a proposta diz: "Mais postos, mais cartões:
 * repetição no começo, condições e variáveis depois" (lacunas de 01/11/2026; desfaz a decisão de
 * 27/10, que liberava cada cartão pelo bloco conquistado num curso). O `bloco` continua dizendo
 * qual bloco do Estúdio o cartão veste (o "Aprenda isso em" e o teste do Members usam).
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
  /** O bloco do Estúdio que o cartão veste; `null` = cartão só do jogo. */
  bloco: string | null
  /** A posição do posto na Jornada (1 a 8) em que o cartão chega. */
  posto: number
  /** O que o cartão faz na rotina, no vocabulário da criança. */
  efeito: string
}

export const CARTAS_LUMI: readonly CartaLumi[] = [
  {
    id: 'quando-amanhecer',
    nome: 'Quando amanhecer',
    tipo: 'quando',
    bloco: null,
    posto: 1,
    efeito: 'Começa a rotina quando o dia nasce.',
  },
  {
    id: 'quando-anoitecer',
    nome: 'Quando anoitecer',
    tipo: 'quando',
    bloco: null,
    posto: 1,
    efeito: 'Começa a rotina quando a noite chega.',
  },
  {
    id: 'voar-ate',
    nome: 'Voar até',
    tipo: 'acao',
    bloco: null,
    posto: 1,
    efeito: 'O Lumi voa até um lugar da ilha.',
  },
  {
    id: 'regar',
    nome: 'Regar',
    tipo: 'acao',
    bloco: null,
    posto: 1,
    efeito: 'Rega o canteiro em que o Lumi está.',
  },
  {
    id: 'colher',
    nome: 'Colher',
    tipo: 'acao',
    bloco: null,
    posto: 1,
    efeito: 'Colhe o que está maduro no canteiro.',
  },
  {
    id: 'guardar',
    nome: 'Guardar tudo',
    tipo: 'acao',
    bloco: null,
    posto: 1,
    efeito: 'Guarda o que o Lumi carrega.',
  },
  {
    id: 'repetir',
    nome: 'Repetir',
    tipo: 'controle',
    bloco: 'sz_js_repeat',
    posto: 1,
    efeito: 'Faz os cartões de dentro algumas vezes.',
  },
  {
    id: 'para-cada',
    nome: 'Para cada',
    tipo: 'controle',
    bloco: 'sz_js_for_each',
    posto: 2,
    efeito: 'Faz os cartões de dentro em cada canteiro, um de cada vez.',
  },
  {
    id: 'enquanto',
    nome: 'Enquanto',
    tipo: 'controle',
    bloco: 'sz_js_while',
    posto: 3,
    efeito: 'Continua fazendo enquanto a condição valer.',
  },
  {
    id: 'se',
    nome: 'Se',
    tipo: 'controle',
    bloco: 'sz_js_if_else',
    posto: 4,
    efeito: 'Só faz os cartões de dentro quando a condição valer.',
  },
  {
    id: 'escolha',
    nome: 'Escolha',
    tipo: 'controle',
    bloco: 'sz_js_switch',
    posto: 5,
    efeito: 'Faz uma coisa diferente para cada caso.',
  },
  {
    id: 'esperar',
    nome: 'Esperar',
    tipo: 'controle',
    bloco: 'sz_js_set_timeout_seconds',
    posto: 2,
    efeito: 'Espera alguns segundos antes do próximo cartão.',
  },
  {
    id: 'guardar-na-memoria',
    nome: 'Guardar na memória',
    tipo: 'controle',
    bloco: 'sz_js_var_create',
    posto: 6,
    efeito: 'O Lumi lembra de um número ou de uma palavra.',
  },
  {
    id: 'contar',
    nome: 'Contar mais um',
    tipo: 'controle',
    bloco: 'sz_js_var_increment',
    posto: 6,
    efeito: 'Soma um ao que o Lumi lembra.',
  },
]

/** O cartão está na mão de quem está nesta posição da Jornada? (Equipe vê tudo: `todos`.) */
export function cartaConquistada(carta: CartaLumi, posicao: number | 'todos'): boolean {
  return posicao === 'todos' || carta.posto <= posicao
}
