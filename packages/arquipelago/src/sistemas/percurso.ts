/**
 * Um percurso com tempo e estrelas (regras puras, sem three nem física): o das copas do Bosque, a
 * entrega pelos telhados da Vila Doce e a subida ao cume do Pico Gelado. Largada perto do chão, um
 * ponto de volta em cada parada (deque, telhado ou trecho da trilha), coisas para pegar pelo
 * caminho (vagalumes, confeitos ou flocos de neve) e a chegada. Nada aqui aloca por quadro.
 */
import {
  MELHOR_TEMPO_MAXIMO_MS,
  type PercursoId,
  type ResultadoDoPercurso,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'
import type { Ponto } from './cipo'
import { receberPatins } from './patins'
import { temPlanador } from './planador'

/** Todos os percursos atuais têm progresso durável, incluindo as corridas das Nuvens. */
export type IdDoPercurso = PercursoId

/** O que muda de um percurso para outro (as contas são as mesmas). */
export interface ConfigDoPercurso {
  id: IdDoPercurso
  /** O título da tela de resultado e o nome do cronômetro. */
  nome: string
  /** O texto do botão na largada. */
  rotuloDaLargada: string
  /** O que o Zappy diz ao começar e quando o percurso para sem chegar. */
  falaDoComeco: string
  falaDoFim: string
  /** A fala das três estrelas. */
  falaDasTresEstrelas: string
  /** Abaixo disto ganha a estrela do tempo. */
  tempoAlvoMs: number
  /** Quantas coisas estão espalhadas; uma delas é o segredo (a terceira estrela, §6.28 A9). */
  vagalumes: number
  /** O segredo do percurso na fala e no resultado ("o vagalume escondido"). */
  escondido: string
  /**
   * O nome delas (a estrela, o cronômetro e o resultado), o símbolo do cronômetro e se a palavra é
   * feminina ("as fitas", "pegas").
   */
  coletavel: { varios: string; Varios: string; simbolo: string; feminino?: boolean }
  /** A coisa é pega a esta distância do centro do corpo. */
  raioDoVagalume: number
  /** Chegou: a esta distância (no chão) da chegada. */
  raioDaChegada: number
  /** Uma parada conta quando o corpo está em cima dela (o pé até isto abaixo do piso). */
  folgaDoDeque: number
  /** Antes da primeira parada, andar mais que isto (no chão) para longe da largada desiste. */
  distanciaParaDesistir: number
  /** Milissegundos do corte suave de volta à parada (escurece, leva e clareia). */
  corteSaiMs: number
  corteVoltaMs: number
  /** O que a chegada dá (os patins da entrega), com a fala; `null` quando não há nada a dar. */
  premio?: (s: Salvamento) => { salvamento: Salvamento; fala: string } | null
  /**
   * O que falta para largar (a fala do Zappy), ou `null` quando dá para começar. A subida do Farol
   * pede o planador: sem ele o vento do alto não leva ninguém, e a criança ficaria presa no meio.
   */
  exige?: (s: Salvamento) => string | null
  /**
   * As paradas só contam na ordem (percursos no chão, em que dava para cortar caminho até a
   * última). Nos percursos do alto, pular uma parada já é chegar mais longe.
   */
  emOrdem?: boolean
}

export const PERCURSO_DAS_COPAS = {
  id: 'bosque-copas',
  nome: 'Percurso nas copas',
  rotuloDaLargada: 'Começar o percurso nas copas',
  falaDoComeco: 'Valendo. Suba a escada e siga pelas copas até o escorregador.',
  falaDoFim: 'O percurso parou. A placa ao pé da escada começa de novo quando você quiser.',
  falaDasTresEstrelas: 'Três estrelas. Você voou pelas copas e achou o vagalume escondido.',
  escondido: 'o vagalume escondido',
  /**
   * Abaixo disto ganha a estrela do tempo. O caminho tem uns 42 m (escada, três pontes, a volta
   * nos deques e o escorregador): correndo sem errar dá uns 9 s e andando uns 19 s (velocidades de
   * `CORPO`); 24 s fica só para quem não cai: com uma queda, só correndo.
   */
  tempoAlvoMs: 24_000,
  /** Quantos vagalumes estão espalhados (pegar todos é a terceira estrela). */
  vagalumes: 5,
  coletavel: { varios: 'vagalumes', Varios: 'Vagalumes', simbolo: '✨' },
  /** O vagalume é pego a esta distância do centro do corpo. */
  raioDoVagalume: 0.8,
  /** Chegou: a esta distância (no chão) do fim do escorregador. */
  raioDaChegada: 1.4,
  /** Um deque conta quando o corpo está em cima dele (o pé até isto abaixo do piso). */
  folgaDoDeque: 0.3,
  /** Antes do primeiro deque, andar mais que isto (no chão) para longe da largada desiste. */
  distanciaParaDesistir: 7,
  /** Segundos do corte suave de volta ao deque (escurece, leva e clareia). */
  corteSaiMs: 260,
  corteVoltaMs: 340,
} as const satisfies ConfigDoPercurso

/**
 * A entrega pelos telhados da Vila Doce (fase2-05): o Bento manda um bolo para a sorveteria pelo
 * caminho de cima. Dos caixotes às três casinhas de telhado plano e ao terraço da sorveteria
 * (âncoras `telhados-*` do `vila-doce.glb`), com um confeito no ar em cada pulo.
 */
export const PERCURSO_DOS_TELHADOS = {
  id: 'vila-telhados',
  nome: 'Entrega pelos telhados',
  rotuloDaLargada: 'Começar a entrega pelos telhados',
  falaDoComeco:
    'Valendo. Suba nos caixotes e leve o bolo pelos telhados até o terraço da sorveteria.',
  falaDoFim: 'A entrega parou. Os caixotes começam de novo quando você quiser.',
  falaDasTresEstrelas: 'Três estrelas. O bolo chegou voando e você achou o confeito escondido.',
  escondido: 'o confeito escondido',
  /**
   * O caminho tem uns 19 m no plano (da largada aos caixotes, às três casinhas e ao terraço), com
   * quatro pulos de 0,8 a 1 m para cima: correndo (`CORPO.correr`) são uns 4 s mais os pulos, e
   * andando uns 9 s. 15 s deixa a estrela para quem para para mirar os pulos, não para quem cai
   * duas vezes.
   */
  tempoAlvoMs: 15_000,
  vagalumes: 4,
  coletavel: { varios: 'confeitos', Varios: 'Confeitos', simbolo: '🍬' },
  raioDoVagalume: 0.8,
  raioDaChegada: 1.2,
  folgaDoDeque: 0.3,
  distanciaParaDesistir: 6,
  corteSaiMs: 260,
  corteVoltaMs: 340,
  /** A primeira chegada traz os patins (`sistemas/patins.ts`). */
  premio: receberPatins,
} as const satisfies ConfigDoPercurso

/**
 * A subida ao cume do Pico Gelado (fase3-07): das bandeirinhas do começo da trilha, em volta da
 * montanha, até a bandeira do platô (âncoras `subida-*`, `floco-*` e `cume` do `pico.glb`), com
 * cinco flocos de neve flutuando na trilha.
 */
export const PERCURSO_DO_CUME = {
  id: 'pico-cume',
  nome: 'Subida ao cume',
  rotuloDaLargada: 'Começar a subida ao cume',
  falaDoComeco: 'Valendo. Suba a trilha em volta da montanha até a bandeira do cume.',
  falaDoFim: 'A subida parou. Nas bandeirinhas da trilha dá para começar de novo quando quiser.',
  falaDasTresEstrelas: 'Três estrelas. Você chegou ao cume e achou o floco de neve escondido.',
  escondido: 'o floco de neve escondido',
  /**
   * O caminho tem uns 31 m (1,7 m até a trilha, 27,4 m de trilha pela linha do meio, medidos no
   * Blender, e o platô até a bandeira): correndo (`CORPO.correr`) são uns 7 s e andando uns 14 s.
   * 18 s deixa a estrela para quem sobe andando sem parar, pegando os flocos do caminho.
   */
  tempoAlvoMs: 18_000,
  vagalumes: 5,
  coletavel: { varios: 'flocos de neve', Varios: 'Flocos de neve', simbolo: '❄️' },
  raioDoVagalume: 0.8,
  raioDaChegada: 1.2,
  folgaDoDeque: 0.3,
  distanciaParaDesistir: 6,
  corteSaiMs: 260,
  corteVoltaMs: 340,
} as const satisfies ConfigDoPercurso

/** As fitas do arco-íris que a Iriê perdeu: a terceira estrela das duas corridas das Nuvens. */
const FITAS_DO_ARCO_IRIS = {
  varios: 'fitas do arco-íris',
  Varios: 'Fitas do arco-íris',
  simbolo: '🎀',
  feminino: true,
} as const

/**
 * Os saltos entre nuvens (fase4-07): dos degraus de nuvem, de plataforma em plataforma (as que
 * sobem e descem, fase4-06), até o tampo da mais alta, com uma fita do arco-íris em cada vão.
 */
export const PERCURSO_DOS_SALTOS = {
  id: 'nuvens-saltos',
  nome: 'Saltos entre nuvens',
  rotuloDaLargada: 'Começar os saltos entre nuvens',
  falaDoComeco:
    'Valendo. Suba os degraus de nuvem e pule de plataforma em plataforma até a mais alta.',
  falaDoFim: 'Os saltos pararam. Nos degraus de nuvem dá para começar de novo quando quiser.',
  falaDasTresEstrelas: 'Três estrelas. Você pulou de nuvem em nuvem e achou a fita escondida.',
  escondido: 'a fita escondida',
  /**
   * Cada salto entre plataformas só cabe quando a de trás está no alto e a da frente embaixo, numa
   * janela a cada 10 s, e a plataforma 1 só recebe do degrau quando está embaixo. Sem perder
   * nenhuma janela, a volta leva até uns 55 s, conforme a fase do ciclo na largada (o teste conta):
   * 60 s dá a estrela a quem não perde nenhuma janela.
   */
  tempoAlvoMs: 60_000,
  /** Uma fita em cada vão entre as plataformas (do degrau para a 1 é só um passo, sem vão). */
  vagalumes: 3,
  coletavel: FITAS_DO_ARCO_IRIS,
  raioDoVagalume: 0.8,
  /** O tampo da plataforma mais alta tem 1,8 m de raio. */
  raioDaChegada: 1.4,
  folgaDoDeque: 0.3,
  distanciaParaDesistir: 6,
  corteSaiMs: 260,
  corteVoltaMs: 340,
} as const satisfies ConfigDoPercurso

/**
 * A corrida de balão (fase4-07): passar de balão pelas seis argolas do arco-íris na ordem
 * (`sistemas/corrida-de-balao.ts`). A primeira argola começa; a sexta é a chegada.
 */
export const PERCURSO_DO_BALAO = {
  id: 'nuvens-balao',
  nome: 'Corrida de balão',
  rotuloDaLargada: 'Passe de balão pela argola vermelha',
  falaDoComeco: 'Valendo. Passe pelas seis argolas do arco-íris na ordem, da vermelha à roxa.',
  falaDoFim: 'A corrida parou. A argola vermelha começa de novo quando você passar por ela.',
  falaDasTresEstrelas: 'Três estrelas. Você voou pelo arco-íris inteiro e achou a fita escondida.',
  escondido: 'a fita escondida',
  /**
   * Um piloto que não erra, pelas regras do balão, faz a volta em uns 29 s (o teste da corrida
   * mede): 45 s dá a estrela a quem pilota com calma, sem precisar ser perfeito.
   */
  tempoAlvoMs: 45_000,
  vagalumes: 3,
  coletavel: FITAS_DO_ARCO_IRIS,
  /** O balão pega a fita a esta distância do meio dele (o envelope é largo). */
  raioDoVagalume: 1.6,
  raioDaChegada: 1.8,
  folgaDoDeque: 0,
  distanciaParaDesistir: 0,
  corteSaiMs: 260,
  corteVoltaMs: 340,
} as const satisfies ConfigDoPercurso

/**
 * A volta pela praia da sua ilha (V19, "primeiros percursos na praia e nas pedras"): da pedra do
 * leste, pela areia do sul, de pedra em pedra até a pedra do oeste, pegando conchas brilhantes.
 * As paradas ficam no chão: contam na ordem. Ninguém cai, só desiste longe da praia.
 */
export const PERCURSO_DA_PRAIA = {
  id: 'praia-pedras',
  nome: 'Volta pela praia',
  rotuloDaLargada: 'Começar a volta pela praia',
  falaDoComeco: 'Valendo. Siga pela areia de pedra em pedra até a pedra grande do oeste.',
  falaDoFim: 'A volta parou. A pedra do leste começa de novo quando você quiser.',
  falaDasTresEstrelas: 'Três estrelas. Você deu a volta na praia e achou a concha escondida.',
  escondido: 'a concha escondida',
  /**
   * A volta tem uns 70 m de areia (o teste mede pelas paradas): correndo são uns 16 s e andando
   * uns 32 s. 26 s deixa a estrela para quem corre a maior parte, parando para pegar as conchas.
   */
  tempoAlvoMs: 26_000,
  vagalumes: 5,
  coletavel: {
    varios: 'conchas brilhantes',
    Varios: 'Conchas brilhantes',
    simbolo: '🐚',
    feminino: true,
  },
  raioDoVagalume: 0.9,
  raioDaChegada: 1.8,
  folgaDoDeque: 0.6,
  /** Sair da praia para dentro da ilha (mais que isto da linha das paradas) desiste. */
  distanciaParaDesistir: 9,
  corteSaiMs: 260,
  corteVoltaMs: 340,
  emOrdem: true,
} as const satisfies ConfigDoPercurso

/**
 * Os corais do Recife (V19): de coral em coral pelo arco em volta da lagoa, do primeiro do oeste
 * ao último do norte, com uma pérola no ar em cada vão. Cair na areia ou na lagoa volta ao último
 * coral alcançado.
 */
export const PERCURSO_DOS_CORAIS = {
  id: 'recife-corais',
  nome: 'Pulos nos corais',
  rotuloDaLargada: 'Começar os pulos nos corais',
  falaDoComeco: 'Valendo. Pule de coral em coral em volta da lagoa até o último do arco.',
  falaDoFim: 'Os pulos pararam. O primeiro coral do arco começa de novo quando você quiser.',
  falaDasTresEstrelas: 'Três estrelas. Você pulou o arco inteiro e achou a pérola escondida.',
  escondido: 'a pérola escondida',
  /**
   * Onze pulos de uns 2,2 m entre os topos (o teste mede): quem mira e pula sem cair leva uns
   * 16 s. 22 s deixa a estrela para quem não cai, sem exigir correr.
   */
  tempoAlvoMs: 22_000,
  vagalumes: 5,
  coletavel: { varios: 'pérolas', Varios: 'Pérolas', simbolo: '🫧', feminino: true },
  raioDoVagalume: 0.8,
  raioDaChegada: 0.7,
  folgaDoDeque: 0.3,
  distanciaParaDesistir: 6,
  corteSaiMs: 260,
  corteVoltaMs: 340,
} as const satisfies ConfigDoPercurso

/**
 * As pegadas do Vale (V19): seguir as pedras do vulcão na ordem, a pé ou montado no dino (a
 * montaria é o brinquedo do Vale e chega mais rápido), pegando os fósseis que brilham no caminho.
 */
export const PERCURSO_DAS_PEGADAS = {
  id: 'vale-pegadas',
  nome: 'Trilha das pedras do vulcão',
  rotuloDaLargada: 'Começar a trilha das pedras',
  falaDoComeco: 'Valendo. Passe pelas pedras do vulcão na ordem, a pé ou montado no dino.',
  falaDoFim: 'A trilha parou. A primeira pedra começa de novo quando você quiser.',
  falaDasTresEstrelas: 'Três estrelas. Você passou por todas as pedras e achou o fóssil escondido.',
  escondido: 'o fóssil escondido',
  /**
   * Seis trechos de uns 5 m entre as pedras (o teste mede): correndo a pé são uns 8 s, montado
   * menos. 12 s dá a estrela a quem corre sem parar ou vai no dino com calma.
   */
  tempoAlvoMs: 12_000,
  vagalumes: 5,
  coletavel: { varios: 'fósseis', Varios: 'Fósseis', simbolo: '🦴' },
  raioDoVagalume: 1.2,
  raioDaChegada: 1.6,
  folgaDoDeque: 2.5,
  distanciaParaDesistir: 8,
  corteSaiMs: 260,
  corteVoltaMs: 340,
  emOrdem: true,
} as const satisfies ConfigDoPercurso

/**
 * A subida final por fora do Farol (E04, a Lenda; arte de 31/10/2026): a escada, as duas quinas, a
 * viga de equilíbrio e o vento até o mirante, com o planador, até a varanda. Usa os movimentos já
 * aprendidos. As paradas vão na ordem (cada trecho pede o movimento dele).
 */
export const FALTA_O_PLANADOR_NO_FAROL =
  'O último trecho da subida é o vento, e só quem plana chega lá em cima. O Floco dá o planador no festival do Pico, quando a banda volta inteira. Até lá, a escada de dentro leva à sala do alto.'

export const PERCURSO_DO_FAROL = {
  id: 'farol-subida',
  nome: 'Subida do Farol',
  rotuloDaLargada: 'Começar a subida do Farol',
  falaDoComeco:
    'Valendo. Suba por fora do Farol com tudo o que você aprendeu: a escada, as quinas, o equilíbrio e o vento com o planador.',
  falaDoFim: 'A subida parou. O pé do Farol começa de novo quando você quiser.',
  falaDasTresEstrelas:
    'Três estrelas. Você chegou à varanda do Farol e achou o vagalume escondido.',
  escondido: 'o vagalume escondido',
  /**
   * Seis trechos com um modo cada (o teste da arte mede os vãos): quem não cai leva uns 40 s,
   * contando o planador no vento. 60 s deixa a estrela para quem sobe sem cair.
   */
  tempoAlvoMs: 60_000,
  vagalumes: 5,
  coletavel: { varios: 'vagalumes', Varios: 'Vagalumes', simbolo: '✨' },
  raioDoVagalume: 0.9,
  raioDaChegada: 1.4,
  folgaDoDeque: 0.4,
  distanciaParaDesistir: 8,
  corteSaiMs: 260,
  corteVoltaMs: 340,
  emOrdem: true,
  exige: (s) => (temPlanador(s) ? null : FALTA_O_PLANADOR_NO_FAROL),
} as const satisfies ConfigDoPercurso

/**
 * A descida de trenó do Pico como minijogo (lacunas, 01/11/2026, `sistemas/corrida-de-portoes.ts`):
 * seis portões de bandeira pela pista em espiral, do platô ao pé, e cinco bandeirinhas no caminho,
 * uma escondida. Passar de trenó pelo primeiro portão começa.
 */
export const PERCURSO_DO_TRENO = {
  id: 'pico-treno',
  nome: 'Descida de trenó',
  rotuloDaLargada: 'Desça de trenó pelo primeiro portão',
  falaDoComeco: 'Valendo. Desça pelos portões de bandeira e pegue as bandeirinhas no caminho.',
  falaDoFim: 'A descida parou. O trenó no platô começa de novo quando você quiser.',
  falaDasTresEstrelas:
    'Três estrelas. Você desceu a montanha inteira e achou a bandeirinha escondida.',
  escondido: 'a bandeirinha escondida',
  /** A pista tem uns 28 m e o trenó vai a até 4,5 m/s: uns 7 s sem parar. 10 s dá a estrela. */
  tempoAlvoMs: 10_000,
  vagalumes: 5,
  coletavel: { varios: 'bandeirinhas', Varios: 'Bandeirinhas', simbolo: '🚩', feminino: true },
  /** Pela linha do meio a bandeirinha fica a 0,55 m: só pega quem guia o trenó para o lado dela. */
  raioDoVagalume: 0.45,
  raioDaChegada: 1.4,
  folgaDoDeque: 0,
  distanciaParaDesistir: 0,
  corteSaiMs: 260,
  corteVoltaMs: 340,
} as const satisfies ConfigDoPercurso

/**
 * A corrida da montaria pela praia do Vale (lacunas, 01/11/2026): montada no dino, seis portões de
 * osso pela areia, de 0° a 105° em volta da ilha, e cinco fósseis brilhantes, um escondido.
 */
export const PERCURSO_DA_MONTARIA = {
  id: 'vale-montaria',
  nome: 'Corrida da montaria',
  rotuloDaLargada: 'Passe montado pelo primeiro portão',
  falaDoComeco: 'Valendo. Galope pela praia pelos portões de osso e pegue os fósseis brilhantes.',
  falaDoFim: 'A corrida parou. O primeiro portão começa de novo quando você passar montado.',
  falaDasTresEstrelas: 'Três estrelas. Você galopou a praia inteira e achou o fóssil escondido.',
  escondido: 'o fóssil escondido',
  /** Uns 24 m pela areia, e o dino corre a 6 m/s: uns 4 s sem errar. 8 s dá a estrela. */
  tempoAlvoMs: 8_000,
  vagalumes: 5,
  coletavel: { varios: 'fósseis', Varios: 'Fósseis', simbolo: '🦴' },
  raioDoVagalume: 1.6,
  raioDaChegada: 2,
  folgaDoDeque: 0,
  distanciaParaDesistir: 0,
  corteSaiMs: 260,
  corteVoltaMs: 340,
} as const satisfies ConfigDoPercurso

/**
 * A volta das boias (lacunas, 01/11/2026, `sistemas/regata.ts`): a regata do barco do cais da sua
 * ilha em volta dela e de volta, remando e guiando para os lados para pegar oito boias de presente,
 * uma escondida.
 */
export const PERCURSO_DA_REGATA = {
  id: 'barco-regata',
  nome: 'Volta das boias',
  rotuloDaLargada: 'Volta das boias, no cais da sua ilha',
  falaDoComeco: 'Valendo. Reme e guie o barco para pegar as boias de presente.',
  falaDoFim: 'A regata parou. O cais da sua ilha começa de novo quando você quiser.',
  falaDasTresEstrelas: 'Três estrelas. Você deu a volta remando e achou a boia escondida.',
  escondido: 'a boia escondida',
  /**
   * Uns 1.200 m: sem remar, a 12 m/s, uns 100 s; remando o tempo todo, uns 75 s. 90 s dá a estrela
   * a quem rema boa parte da volta.
   */
  tempoAlvoMs: 90_000,
  vagalumes: 8,
  coletavel: { varios: 'boias', Varios: 'Boias', simbolo: '🛟', feminino: true },
  raioDoVagalume: 1.6,
  raioDaChegada: 2,
  folgaDoDeque: 0,
  distanciaParaDesistir: 0,
  corteSaiMs: 260,
  corteVoltaMs: 340,
} as const satisfies ConfigDoPercurso

/** Cada percurso pelo id (a tela do resultado e o cronômetro leem daqui). */
export const PERCURSOS_DO_JOGO: Readonly<Record<IdDoPercurso, ConfigDoPercurso>> = {
  'bosque-copas': PERCURSO_DAS_COPAS,
  'vila-telhados': PERCURSO_DOS_TELHADOS,
  'pico-cume': PERCURSO_DO_CUME,
  'nuvens-saltos': PERCURSO_DOS_SALTOS,
  'nuvens-balao': PERCURSO_DO_BALAO,
  'praia-pedras': PERCURSO_DA_PRAIA,
  'recife-corais': PERCURSO_DOS_CORAIS,
  'vale-pegadas': PERCURSO_DAS_PEGADAS,
  'farol-subida': PERCURSO_DO_FAROL,
  'pico-treno': PERCURSO_DO_TRENO,
  'vale-montaria': PERCURSO_DA_MONTARIA,
  'barco-regata': PERCURSO_DA_REGATA,
}

/** "Os 5 vagalumes", "As 4 fitas do arco-íris" (a estrela de pegar todas). */
export function todasAsColetaveis(config: ConfigDoPercurso, quantas: number): string {
  return `${config.coletavel.feminino ? 'As' : 'Os'} ${quantas} ${config.coletavel.varios}`
}

/** "Vagalumes pegos", "Fitas do arco-íris pegas" (o título do contador). */
export function coletaveisPegas(config: ConfigDoPercurso): string {
  return `${config.coletavel.Varios} ${config.coletavel.feminino ? 'pegas' : 'pegos'}`
}

export interface DequeDoPercurso extends Ponto {
  raio: number
  /** Onde o corpo volta depois de uma queda (no piso do deque, longe do tronco). */
  volta: Ponto
  /** Para onde olhar ao voltar (o caminho segue por ali). */
  rumoDaVolta: number
}

/** Os pontos do percurso no mundo (a ilha lê das âncoras e das constantes do Bosque). */
export interface PontosDoPercurso {
  /** Onde a corrida começa (na frente da placa) e para onde olhar ali (a escada). */
  largada: Ponto
  rumoDaLargada: number
  deques: DequeDoPercurso[]
  chegada: Ponto
  vagalumes: Ponto[]
  /** O centro da ilha e o raio dela: sair da ilha desiste. */
  centro: Ponto
  raioDaIlha: number
}

export type SituacaoDaCorrida = 'correndo' | 'chegou' | 'desistiu'

/**
 * Uma corrida. O tempo é o do jogo, somado quadro a quadro enquanto ela anda (como a física): menu,
 * ferramenta aberta (a cena para), aba escondida e o corte de volta ao deque não contam.
 */
export interface Corrida {
  situacao: SituacaoDaCorrida
  /** O tempo corrido até agora (e, depois de chegar, o tempo final). */
  tempoMs: number
  /** O último deque alcançado (−1 = nenhum ainda). */
  deque: number
  pegos: boolean[]
  /** Qual das coisas é o segredo (−1 = nenhum: a estrela pede todas, como antes). */
  segredo: number
}

export function criarCorrida(vagalumes: number, segredo = -1): Corrida {
  return {
    situacao: 'correndo',
    tempoMs: 0,
    deque: -1,
    pegos: Array.from({ length: vagalumes }, () => false),
    segredo: segredo >= 0 && segredo < vagalumes ? segredo : -1,
  }
}

/**
 * O segredo do percurso (§6.28, A9: a terceira estrela é "achar o segredo"): a coisa mais longe da
 * linha entre a largada e a chegada, que fica escondida e só aparece de perto (`SEGREDO.apareceA`).
 * Todas as coisas do percurso já são alcançáveis (os testes medem); o segredo só não se mostra.
 */
export const SEGREDO = { apareceA: 3 } as const

export function indiceDoSegredo(
  inicio: { x: number; z: number },
  fim: { x: number; z: number },
  coisas: readonly { x: number; z: number }[],
): number {
  const vx = fim.x - inicio.x,
    vz = fim.z - inicio.z
  const l = Math.hypot(vx, vz)
  let melhor = -1,
    maior = -1
  coisas.forEach((p, i) => {
    const d =
      l < 1e-6
        ? Math.hypot(p.x - inicio.x, p.z - inicio.z)
        : Math.abs((p.x - inicio.x) * vz - (p.z - inicio.z) * vx) / l
    if (d >= maior) {
      maior = d
      melhor = i
    }
  })
  return melhor
}

/** O segredo aparece quando o corpo chega perto dele (no plano e sem muita diferença de altura). */
export function segredoAparece(
  p: { x: number; y: number; z: number },
  corpo: { x: number; y: number; z: number },
): boolean {
  return Math.hypot(p.x - corpo.x, p.z - corpo.z) <= SEGREDO.apareceA && Math.abs(p.y - corpo.y) < 3
}

export function vagalumesPegos(c: Corrida): number {
  let n = 0
  for (const p of c.pegos) if (p) n++
  return n
}

export type EventoDaCorrida =
  | { tipo: 'deque'; indice: number }
  | { tipo: 'vagalume'; indice: number }
  | { tipo: 'caiu'; deque: number }
  | { tipo: 'chegou' }
  | { tipo: 'desistiu' }
  | null

/** O que o personagem é agora, lido a cada quadro. */
export interface CorpoNaCorrida {
  /** O centro do corpo. */
  x: number
  y: number
  z: number
  /** A altura dos pés. */
  pes: number
  /** Pisando no chão da ilha (não num deque, ponte, degrau ou escorregador). */
  noChaoDaIlha: boolean
}

/**
 * Um quadro da corrida, com `dtMs` de jogo: no máximo um evento por quadro, na ordem chegada,
 * parada, coisa pega, queda, desistência (chegar ao fim nunca conta como queda).
 * Passar de uma hora desiste: o salvamento não guarda tempo acima disso.
 */
export function passoDaCorrida(
  c: Corrida,
  corpo: CorpoNaCorrida,
  pontos: PontosDoPercurso,
  dtMs: number,
  config: ConfigDoPercurso = PERCURSO_DAS_COPAS,
): EventoDaCorrida {
  if (c.situacao !== 'correndo') return null
  c.tempoMs += Math.max(0, dtMs)
  if (c.tempoMs > MELHOR_TEMPO_MAXIMO_MS) {
    c.situacao = 'desistiu'
    return { tipo: 'desistiu' }
  }
  const ultimo = pontos.deques.length - 1
  const chegada = pontos.chegada
  if (
    c.deque === ultimo &&
    Math.hypot(corpo.x - chegada.x, corpo.z - chegada.z) < config.raioDaChegada &&
    corpo.pes < chegada.y + 0.6
  ) {
    c.situacao = 'chegou'
    c.tempoMs = Math.round(c.tempoMs)
    return { tipo: 'chegou' }
  }
  const ate = config.emOrdem
    ? Math.min(c.deque + 1, pontos.deques.length - 1)
    : pontos.deques.length - 1
  for (let i = ate; i > c.deque; i--) {
    const d = pontos.deques[i]
    if (!d) continue
    if (
      Math.hypot(corpo.x - d.x, corpo.z - d.z) < d.raio &&
      corpo.pes > d.y - config.folgaDoDeque
    ) {
      c.deque = i
      return { tipo: 'deque', indice: i }
    }
  }
  for (let i = 0; i < pontos.vagalumes.length; i++) {
    const v = pontos.vagalumes[i]
    if (!v || c.pegos[i]) continue
    if (Math.hypot(corpo.x - v.x, corpo.y - v.y, corpo.z - v.z) < config.raioDoVagalume) {
      c.pegos[i] = true
      return { tipo: 'vagalume', indice: i }
    }
  }
  if (c.deque >= 0 && corpo.noChaoDaIlha) return { tipo: 'caiu', deque: c.deque }
  const foraDaIlha =
    Math.hypot(corpo.x - pontos.centro.x, corpo.z - pontos.centro.z) > pontos.raioDaIlha + 1
  const longeDaLargada =
    c.deque < 0 &&
    corpo.noChaoDaIlha &&
    Math.hypot(corpo.x - pontos.largada.x, corpo.z - pontos.largada.z) >
      config.distanciaParaDesistir
  if (foraDaIlha || longeDaLargada) {
    c.situacao = 'desistiu'
    return { tipo: 'desistiu' }
  }
  return null
}

/** As estrelas de UMA corrida que chegou. */
export function estrelasDaCorrida(
  c: Corrida,
  config: ConfigDoPercurso = PERCURSO_DAS_COPAS,
): ResultadoDoPercurso['estrelas'] {
  return {
    chegada: c.situacao === 'chegou',
    tempo: c.situacao === 'chegou' && c.tempoMs <= config.tempoAlvoMs,
    // A terceira estrela é o segredo (A9). O campo guardado continua `vagalumes`: quem já tinha a
    // estrela por pegar todas continua com ela (cada estrela fica para sempre).
    vagalumes:
      c.situacao === 'chegou' &&
      (c.segredo >= 0 ? c.pegos[c.segredo] === true : vagalumesPegos(c) === c.pegos.length),
  }
}

/**
 * O melhor resultado depois desta corrida: cada estrela fica para sempre (podem vir de corridas
 * diferentes) e o melhor tempo é o menor. Corrida que não chegou não muda nada.
 */
export function juntarResultado(
  antes: ResultadoDoPercurso | undefined,
  c: Corrida,
  config: ConfigDoPercurso = PERCURSO_DAS_COPAS,
): ResultadoDoPercurso | undefined {
  if (c.situacao !== 'chegou') return antes
  const agora = estrelasDaCorrida(c, config)
  if (!antes) return { estrelas: agora, melhorTempoMs: c.tempoMs }
  return {
    estrelas: {
      chegada: antes.estrelas.chegada || agora.chegada,
      tempo: antes.estrelas.tempo || agora.tempo,
      vagalumes: antes.estrelas.vagalumes || agora.vagalumes,
    },
    melhorTempoMs: Math.min(antes.melhorTempoMs, c.tempoMs),
  }
}

export function quantasEstrelas(e: ResultadoDoPercurso['estrelas']): number {
  return Number(e.chegada) + Number(e.tempo) + Number(e.vagalumes)
}

/** "0:23,4": minutos, segundos e o décimo (o cronômetro e a tela de resultado). */
export function formatarTempo(ms: number): string {
  const decimos = Math.floor(Math.max(0, ms) / 100)
  const min = Math.floor(decimos / 600)
  const seg = Math.floor((decimos % 600) / 10)
  return `${min}:${String(seg).padStart(2, '0')},${decimos % 10}`
}
