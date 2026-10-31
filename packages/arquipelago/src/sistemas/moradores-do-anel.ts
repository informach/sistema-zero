import { PEDIDOS_DO_ANEL } from '@sistemazero/arquipelago-contracts'
import type { Aniversario, Gostos, PedidoDeMorador } from './moradores'

export const MORADORES_COM_NOVA_AMIZADE = ['mare', 'floco', 'jade', 'irie', 'nico'] as const
export type MoradorDoAnel = (typeof MORADORES_COM_NOVA_AMIZADE)[number]

interface VidaDoMorador {
  nome: string
  aniversario: Aniversario
  gostos: Gostos
  convite: string
  pedidos: readonly PedidoDeMorador[]
  amizade: readonly [string, string, string, string, string, string]
  pagina: { ilha: 'pico' | 'vale-dos-dinos' | 'nuvens'; texto: string; entrega: string } | null
}

/** Dados editoriais. As contas, a mochila e os limites são os mesmos de Capi e Bento. */
export const VIDA_NO_ANEL = {
  mare: {
    nome: 'Maré',
    aniversario: { mes: 6, dia: 8 },
    gostos: { salada: 'gosta', alface: 'gosta' },
    convite: 'Maré gosta de salada e alface. Escolha um presente da mochila.',
    pedidos: PEDIDOS_DO_ANEL.mare,
    amizade: [
      'O primeiro traço já começa um mapa.',
      'Gosto de olhar as marés com você.',
      'A Íris deixava espaço para caminhos novos nos mapas.',
      'Nem todo caminho precisa ser reto.',
      'Seu cuidado dá cor ao Recife.',
      'Com você por perto, dá vontade de desenhar outra rota.',
    ],
    pagina: null,
  },
  floco: {
    nome: 'Floco',
    aniversario: { mes: 6, dia: 21 },
    gostos: { pipoca: 'gosta', 'chocolate-quente': 'gosta' },
    convite: 'Floco gosta de pipoca e chocolate quente. Escolha um presente da mochila.',
    pedidos: PEDIDOS_DO_ANEL.floco,
    amizade: [
      'Uma nota de cada vez também vira música.',
      'Seu passo já acompanha o ritmo.',
      'A Íris ouvia meus ensaios mesmo quando eu errava.',
      'Hoje o silêncio parece um descanso entre notas.',
      'Este palco fica mais alegre quando você chega.',
      'Podemos tentar uma música nova juntos.',
    ],
    pagina: {
      ilha: 'pico',
      texto: 'A neve cobre tudo o que a gente não termina. Achei bonito, depois achei triste.',
      entrega: 'Guardei uma página da Íris entre as partituras. Agora ela está no seu diário.',
    },
  },
  jade: {
    nome: 'Jade',
    aniversario: { mes: 5, dia: 18 },
    gostos: { milho: 'gosta', salada: 'gosta' },
    convite: 'Jade gosta de milho e salada. Escolha um presente da mochila.',
    pedidos: PEDIDOS_DO_ANEL.jade,
    amizade: [
      'Olhar com calma ajuda a descobrir.',
      'Cada pegada conta um pedaço do caminho.',
      'A Íris também gostava de desenhar o que via no Vale.',
      'Um detalhe pequeno pode mudar o desenho inteiro.',
      'Seu cuidado protege os ninhos.',
      'Ainda temos muito para descobrir juntos.',
    ],
    pagina: {
      ilha: 'vale-dos-dinos',
      texto: 'Guardei tantos rascunhos que virou uma montanha.',
      entrega: 'Encontrei uma página da Íris entre os desenhos do Vale. Guarde no seu diário.',
    },
  },
  irie: {
    nome: 'Iriê',
    aniversario: { mes: 9, dia: 21 },
    gostos: { tomate: 'gosta', pipoca: 'gosta' },
    convite: 'Iriê gosta de tomate e pipoca. Escolha um presente da mochila.',
    pedidos: PEDIDOS_DO_ANEL.irie,
    amizade: [
      'Um fio já é um começo.',
      'Hoje separei uma cor nova para tecer.',
      'A Íris guardava os rascunhos com muito cuidado.',
      'Um nó pode virar parte do desenho.',
      'Seu jeito de criar também colore estas nuvens.',
      'O arco-íris tem lugar para muitas ideias.',
    ],
    pagina: {
      ilha: 'nuvens',
      texto: 'Deixei a faísca para quem vier depois.',
      entrega: 'Achei uma página da Íris junto dos fios. Ela agora faz parte do seu diário.',
    },
  },
  // O caranguejo Nico, carteiro da praia da sua ilha (§6.28, A19). Aniversário no Dia do Carteiro.
  nico: {
    nome: 'Nico',
    aniversario: { mes: 1, dia: 25 },
    gostos: { alface: 'gosta', salada: 'gosta' },
    convite: 'Nico gosta de alface e salada. Escolha um presente da mochila.',
    pedidos: PEDIDOS_DO_ANEL.nico,
    amizade: [
      'Cada carta chega no seu tempo.',
      'Hoje a areia está boa para andar de lado.',
      'A Íris escrevia cartas para quem ainda ia chegar.',
      'Uma carta curta também carrega muita coisa.',
      'Com você, o correio da praia voltou a ter cor.',
      'Se um dia faltar carta, a gente escreve uma nova.',
    ],
    pagina: null,
  },
} as const satisfies Readonly<Record<MoradorDoAnel, VidaDoMorador>>

export const CORACOES_DAS_PAGINAS_DO_ANEL = 2
