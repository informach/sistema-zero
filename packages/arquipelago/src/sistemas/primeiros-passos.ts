import { CRESCIMENTO_MS, type Semente } from '@sistemazero/arquipelago-contracts'
import type { PrimeiroPedido } from './primeiro-pedido'

/**
 * Os primeiros passos com o Zappy (proposta "Primeiros passos", canvas de 30/10/2026): seis
 * capítulos e 23 falas que ensinam fazendo. Cada fala com tarefa espera o jogo mudar de verdade
 * (andar, abrir a porta, plantar); ler e fechar não conta. O passo da vez sai daqui, puro; a tela
 * (`interface/primeiros-passos.tsx`) só lê o jogo e mostra.
 */

/** O último jeito de jogar: o texto e a tecla desenhada mudam com ele. */
export type Entrada = 'teclado' | 'toque' | 'controle'

/** Onde o anel acende na HUD (ou no menu, ou na barra do Construir). */
export type Anel =
  | 'necessidades'
  | 'mochila'
  | 'menu'
  | 'acao'
  | 'pular'
  | 'construir'
  | 'parede'
  | 'porta'
  | 'objetos'
  | 'pronto'
  | 'mapa'
  | 'relogio'
  | 'quadro'
  | 'desafio-de-hoje'

/** Para onde o Zappy voa no mundo (resolvido pela tela com os interativos registrados). */
export type Guia =
  | 'porta'
  | 'canteiro-vazio'
  | 'canteiro-plantado'
  | 'canteiro-maduro'
  | 'casa'
  | 'geladeira'

/** O que a regra precisa saber do jogo agora. */
export interface Leitura {
  portaNova: boolean
  /** A etapa do primeiro pedido (`null`: a geladeira já foi ganha). */
  pedido: PrimeiroPedido['etapa'] | null
  temGeladeira: boolean
  geladeiraPosta: boolean
  /** A obra da casa tem um cômodo além do quarto. */
  comodoNovo: boolean
  /** A obra da casa tem uma porta além da porta nova (para entrar no cômodo novo). */
  portaNoComodo: boolean
  /** O Construir está aberto na casa. */
  construindo: boolean
  menuAberto: boolean
  /** O interativo ao alcance (`alvo.id` da loja). */
  alvo: string | null
  /** Desde o começo do passo: metros andados, radianos de câmera girados e pulos. */
  andou: number
  girou: number
  pulou: number
  /** A escolha da fala 16: fazer o cômodo da geladeira agora ou depois. */
  obra: 'agora' | 'depois' | null
}

/** O que a fala pode citar: o nome de quem joga e a planta que está na horta. */
export interface Contexto {
  entrada: Entrada
  nome: string
  semente: Semente | null
  /** A fala do mapa fala da jornada: vem da voz (Kids ou adulto). */
  falaDoMapa: string
}

export interface Tarefa {
  /** O que fazer, curto, à direita da tecla. */
  rotulo: string
  /** As teclas (ou botões) desenhadas, por jeito de jogar. */
  teclas?: Partial<Record<Entrada, readonly string[]>>
  /** Um complemento curto ao lado das teclas. */
  extra?: Partial<Record<Entrada, string>>
}

export const IDS_DOS_PASSOS = [
  'oi',
  'andar',
  'olhar',
  'pular',
  'porta-perto',
  'porta-usar',
  'plantar',
  'regar',
  'crescer',
  'barrinhas',
  'mochila',
  'menu',
  'mapa',
  'explorar',
  'colher',
  'escolha',
  'construir',
  'parede',
  'porta-do-comodo',
  'objetos',
  'pronto',
  'geladeira',
  'fim',
] as const

export type IdDoPasso = (typeof IDS_DOS_PASSOS)[number]

export interface Passo {
  id: IdDoPasso
  capitulo: 1 | 2 | 3 | 4 | 5 | 6
  fala: (c: Contexto) => string
  tarefa?: Tarefa
  /** A tarefa foi cumprida (passo com tarefa: o X só esconde a fala). */
  feito?: (l: Leitura) => boolean
  /** O jogo já tem isso feito ao chegar no passo: vira lembrete ("Você já fez isso"). */
  jaFeito?: (l: Leitura) => boolean
  /** Não se aplica agora: segue para o próximo sem mostrar. */
  pular?: (l: Leitura) => boolean
  /** Só aparece quando isto vale (a colheita espera a planta amadurecer). */
  esperar?: (l: Leitura) => boolean
  anel?: Anel | Partial<Record<Entrada, Anel>>
  guia?: Guia
  /** A fala mora dentro do menu de pausa (o menu aberto não a esconde). */
  noMenu?: boolean
  /** A fala 16: dois botões no lugar da tarefa. */
  escolha?: boolean
}

/** Metros para o "andar" contar, um quarto de volta para o "olhar". */
export const ANDAR_PARA_CONTAR = 2
export const GIRAR_PARA_CONTAR = Math.PI / 4
/** Quanto o "Isso." fica na tela antes da próxima fala. */
export const ISSO_MS = 1500
/** Quanto um lembrete ("Você já fez isso") fica antes de seguir sozinho. */
export const LEMBRETE_MS = 4000

const ARTIGO: Readonly<Record<Semente, { nome: string; pronta: string }>> = {
  alface: { nome: 'A alface', pronta: 'pronta' },
  tomate: { nome: 'O tomate', pronta: 'pronto' },
  milho: { nome: 'O milho', pronta: 'pronto' },
}
const POR_EXTENSO: Readonly<Record<number, string>> = {
  1: 'um',
  2: 'dois',
  3: 'três',
  4: 'quatro',
  5: 'cinco',
  6: 'seis',
  7: 'sete',
  8: 'oito',
  9: 'nove',
  10: 'dez',
}

/** "A alface cresce de verdade, em uns três minutos." (o tempo é o da horta, não um número solto). */
export function frasesDaPlanta(semente: Semente | null): { cresce: string; pronta: string } {
  if (!semente) return { cresce: 'A planta cresce de verdade.', pronta: 'A planta ficou pronta.' }
  const a = ARTIGO[semente]
  const minutos = Math.round(CRESCIMENTO_MS[semente] / 60000)
  return {
    cresce: `${a.nome} cresce de verdade, em uns ${POR_EXTENSO[minutos] ?? minutos} minutos.`,
    pronta: `${a.nome} ficou ${a.pronta}.`,
  }
}

const porEntrada =
  (textos: Record<Entrada, string>) =>
  (c: Contexto): string =>
    textos[c.entrada]

const USAR_TECLAS = { teclado: ['E'], toque: ['Usar'], controle: ['Botão da direita'] } as const
const depoisDoPedido = (l: Leitura, etapas: readonly PrimeiroPedido['etapa'][]) =>
  l.pedido === null || etapas.includes(l.pedido)
const semObraAgora = (l: Leitura) => l.obra !== 'agora' || (l.geladeiraPosta && !l.construindo)

export const PASSOS: readonly Passo[] = [
  {
    id: 'oi',
    capitulo: 1,
    fala: (c) => `Oi, ${c.nome}. Eu sou o Zappy. Vou te mostrar a sua casa, uma coisa de cada vez.`,
  },
  {
    id: 'andar',
    capitulo: 2,
    fala: porEntrada({
      teclado: 'Ande pelo quarto com W A S D ou com as setas.',
      toque: 'Ponha o dedo no canto de baixo e arraste para andar.',
      controle: 'Use a alavanca da esquerda para andar.',
    }),
    tarefa: {
      rotulo: 'Andar um pouco',
      teclas: { teclado: ['W', 'A', 'S', 'D'], controle: ['Alavanca esquerda'] },
      extra: { teclado: 'Shift corre', toque: 'o círculo nasce no dedo' },
    },
    feito: (l) => l.andou >= ANDAR_PARA_CONTAR,
  },
  {
    id: 'olhar',
    capitulo: 2,
    fala: porEntrada({
      teclado: 'Agora olhe em volta. Arraste a tela com o mouse.',
      toque: 'Agora olhe em volta. Arraste o dedo na tela, longe dos botões.',
      controle: 'Agora olhe em volta com a alavanca da direita.',
    }),
    tarefa: {
      rotulo: 'Girar a câmera',
      teclas: { teclado: ['Mouse'], controle: ['Alavanca direita'] },
      extra: { teclado: 'arrastar a tela', toque: 'arrastar a tela' },
    },
    feito: (l) => l.girou >= GIRAR_PARA_CONTAR,
  },
  {
    id: 'pular',
    capitulo: 2,
    fala: porEntrada({
      teclado: 'Agora pule com a barra de espaço.',
      toque: 'Agora toque em Pular.',
      controle: 'Agora pule com o botão de baixo.',
    }),
    tarefa: {
      rotulo: 'Pular uma vez',
      teclas: { teclado: ['Espaço'], toque: ['Pular'], controle: ['Botão de baixo'] },
    },
    feito: (l) => l.pulou >= 1,
    anel: { toque: 'pular' },
  },
  {
    id: 'porta-perto',
    capitulo: 3,
    fala: () => 'A porta nova está brilhando. Chegue pertinho dela.',
    tarefa: {
      rotulo: 'Chegar na porta',
      extra: { teclado: 'Siga o Zappy', toque: 'Siga o Zappy', controle: 'Siga o Zappy' },
    },
    feito: (l) => l.alvo === 'porta-nova' || l.portaNova,
    jaFeito: (l) => l.portaNova,
    guia: 'porta',
  },
  {
    id: 'porta-usar',
    capitulo: 3,
    fala: porEntrada({
      teclado: 'Quando aparece a tecla E, é só apertar para usar.',
      toque: 'Quando o botão Usar acende, é só tocar nele.',
      controle: 'Quando aparece um aviso, aperte o botão da direita para usar.',
    }),
    tarefa: { rotulo: 'Abrir a porta nova', teclas: USAR_TECLAS },
    feito: (l) => l.portaNova,
    jaFeito: (l) => l.portaNova,
    anel: 'acao',
    guia: 'porta',
  },
  {
    id: 'plantar',
    capitulo: 4,
    fala: () => 'Essa é a sua horta. Chegue num canteiro e plante uma semente.',
    tarefa: {
      rotulo: 'Plantar uma semente',
      teclas: USAR_TECLAS,
      extra: {
        teclado: 'perto do canteiro',
        toque: 'perto do canteiro',
        controle: 'perto do canteiro',
      },
    },
    feito: (l) => depoisDoPedido(l, ['regar', 'crescer', 'colher']),
    jaFeito: (l) => depoisDoPedido(l, ['regar', 'crescer', 'colher']),
    anel: 'acao',
    guia: 'canteiro-vazio',
  },
  {
    id: 'regar',
    capitulo: 4,
    fala: () => 'Toda semente precisa de água. Regue o canteiro.',
    tarefa: { rotulo: 'Regar o canteiro', teclas: USAR_TECLAS },
    feito: (l) => depoisDoPedido(l, ['crescer', 'colher']),
    jaFeito: (l) => depoisDoPedido(l, ['crescer', 'colher']),
    anel: 'acao',
    guia: 'canteiro-plantado',
  },
  {
    id: 'crescer',
    capitulo: 4,
    fala: (c) => `${frasesDaPlanta(c.semente).cresce} Enquanto isso, vou te mostrar umas coisas.`,
    pular: (l) => l.pedido !== 'crescer',
    guia: 'canteiro-plantado',
  },
  {
    id: 'barrinhas',
    capitulo: 5,
    fala: () =>
      'Essas barrinhas são a sua fome, a sua energia e a sua diversão. Se a fome ou a energia baixar, eu aviso.',
    anel: 'necessidades',
  },
  {
    id: 'mochila',
    capitulo: 5,
    fala: porEntrada({
      teclado:
        'Na mochila ficam suas sementes e o que você ganhar. Patins, lanterna e o que dá para usar ganham uma tecla de 1 a 5.',
      toque:
        'Na mochila ficam suas sementes e o que você ganhar. O que dá para usar, você usa tocando nele.',
      controle: 'Na mochila ficam suas sementes e o que você ganhar, como patins e lanterna.',
    }),
    anel: 'mochila',
  },
  {
    id: 'menu',
    capitulo: 5,
    fala: porEntrada({
      teclado:
        'No menu ficam o mapa, o diário e o álbum. Abra o menu no botão do canto ou com Esc.',
      toque: 'No menu ficam o mapa, o diário e o álbum. Toque no botão do canto para abrir.',
      controle: 'No menu ficam o mapa, o diário e o álbum. Abra o menu com o botão Start.',
    }),
    tarefa: {
      rotulo: 'Abrir o menu',
      teclas: { teclado: ['Esc'], toque: ['Menu'], controle: ['Start'] },
    },
    feito: (l) => l.menuAberto,
    anel: 'menu',
  },
  {
    id: 'mapa',
    capitulo: 5,
    fala: (c) => c.falaDoMapa,
    anel: 'mapa',
    noMenu: true,
  },
  {
    id: 'explorar',
    capitulo: 5,
    fala: () => 'Pode fechar o menu e explorar. Eu chamo quando a planta ficar pronta.',
    pular: (l) => l.pedido !== 'crescer',
    noMenu: true,
  },
  {
    id: 'colher',
    capitulo: 6,
    fala: (c) => `${frasesDaPlanta(c.semente).pronta} Volte à horta e colha.`,
    tarefa: { rotulo: 'Colher na horta', teclas: USAR_TECLAS },
    feito: (l) => l.temGeladeira,
    jaFeito: (l) => l.temGeladeira,
    esperar: (l) => l.pedido === 'colher' || l.temGeladeira,
    anel: 'acao',
    guia: 'canteiro-maduro',
  },
  {
    id: 'escolha',
    capitulo: 6,
    fala: () =>
      'Chegou o projeto azul da geladeira. Ela precisa de um cômodo novo, fora do quarto.',
    feito: (l) => l.obra !== null,
    pular: (l) => l.geladeiraPosta,
    escolha: true,
    guia: 'casa',
  },
  {
    id: 'construir',
    capitulo: 6,
    fala: () => 'Escolha Construir, no canto da tela.',
    tarefa: { rotulo: 'Abrir o Construir' },
    feito: (l) => l.construindo,
    pular: semObraAgora,
    anel: 'construir',
  },
  {
    id: 'parede',
    capitulo: 6,
    // Na frente da porta nova fica a varanda (ocupada no lote): o cômodo vai encostado na casa.
    fala: () => 'Escolha Parede e arraste no chão, encostado na casa, até fechar um cômodo.',
    tarefa: {
      rotulo: 'Fechar um cômodo',
      teclas: { teclado: ['Parede'], toque: ['Parede'], controle: ['Parede'] },
    },
    feito: (l) => l.comodoNovo,
    jaFeito: (l) => l.comodoNovo,
    pular: semObraAgora,
    anel: 'parede',
  },
  {
    id: 'porta-do-comodo',
    capitulo: 6,
    fala: () => 'Agora escolha Porta e toque numa parede do cômodo, para dar para entrar.',
    tarefa: {
      rotulo: 'Pôr uma porta',
      teclas: { teclado: ['Porta'], toque: ['Porta'], controle: ['Porta'] },
    },
    feito: (l) => l.portaNoComodo,
    jaFeito: (l) => l.portaNoComodo,
    pular: semObraAgora,
    anel: 'porta',
  },
  {
    id: 'objetos',
    capitulo: 6,
    fala: () => 'Agora escolha Objetos e toque dentro do cômodo para pôr a geladeira.',
    tarefa: {
      rotulo: 'Pôr a geladeira',
      teclas: { teclado: ['Objetos'], toque: ['Objetos'], controle: ['Objetos'] },
    },
    feito: (l) => l.geladeiraPosta,
    jaFeito: (l) => l.geladeiraPosta,
    pular: semObraAgora,
    anel: 'objetos',
  },
  {
    id: 'pronto',
    capitulo: 6,
    fala: () => 'Escolha Pronto para voltar a andar.',
    tarefa: {
      rotulo: 'Voltar ao Viver',
      teclas: { teclado: ['Pronto'], toque: ['Pronto'], controle: ['Pronto'] },
    },
    feito: (l) => !l.construindo,
    pular: (l) => l.obra !== 'agora' || !l.construindo,
    anel: 'pronto',
  },
  {
    id: 'geladeira',
    capitulo: 6,
    fala: () => 'A geladeira já guarda 4 coisas. Dê uma cara para ela e ela guarda 12.',
    pular: (l) => !l.geladeiraPosta,
    guia: 'geladeira',
  },
  {
    id: 'fim',
    capitulo: 6,
    fala: () =>
      'Agora a ilha é sua. Se esquecer alguma coisa, me chame no menu, em Primeiros passos.',
  },
]

export const PASSO_FINAL = PASSOS.length - 1
/** Onde a obra continua quando a criança escolheu "Depois" e abre o Construir mais tarde. */
export const INICIO_DA_OBRA = PASSOS.findIndex((p) => p.id === 'parede')
export const PASSO_DA_GELADEIRA = PASSOS.findIndex((p) => p.id === 'geladeira')

export function indiceDoPasso(id: IdDoPasso): number {
  return PASSOS.findIndex((p) => p.id === id)
}

/** O primeiro passo a partir de `indice` que se aplica agora (pula os que não valem). */
export function passoQueVale(indice: number, l: Leitura): number {
  let i = Math.max(0, indice)
  while (i < PASSO_FINAL && PASSOS[i]?.pular?.(l)) i++
  return Math.min(i, PASSO_FINAL)
}

/** Ao chegar no passo: ele é uma fala normal ou um lembrete do que o jogo já tem. */
export function comoComeca(indice: number, l: Leitura): 'fala' | 'lembrete' {
  return PASSOS[indice]?.jaFeito?.(l) ? 'lembrete' : 'fala'
}

/**
 * No meio da obra (Parede, Objetos) a criança fechou o Construir: o passo volta para "Escolha
 * Construir", para a fala nunca pedir uma ferramenta que não está na tela.
 */
export function voltarAoConstruir(indice: number, l: Leitura): number {
  const id = PASSOS[indice]?.id
  if (
    (id === 'parede' || id === 'porta-do-comodo' || id === 'objetos') &&
    !l.construindo &&
    !l.geladeiraPosta
  )
    return indiceDoPasso('construir')
  return indice
}

/** A tarefa do passo foi cumprida agora. */
export function cumpriu(indice: number, l: Leitura): boolean {
  return PASSOS[indice]?.feito?.(l) ?? false
}

/** O anel do passo para este jeito de jogar. */
export function anelDoPasso(p: Pick<Passo, 'anel'>, entrada: Entrada): Anel | null {
  if (!p.anel) return null
  return typeof p.anel === 'string' ? p.anel : (p.anel[entrada] ?? null)
}

/** Situação guardada no aparelho, por público e perfil. */
export interface MarcaDosPassos {
  situacao: 'andando' | 'pulado' | 'feito'
  passo: IdDoPasso
  /** Escolheu "Depois": a obra da geladeira volta quando o Construir abrir. */
  obraPendente?: boolean
}

export function chaveDosPassos(publico: string, perfil: string): string {
  return `arquipelago:passos:${publico}:${perfil}`
}

/** Lê a marca; o que estiver estranho conta como ausente. */
export function lerMarca(texto: string | null): MarcaDosPassos | undefined {
  if (!texto) return undefined
  try {
    const d = JSON.parse(texto) as Partial<MarcaDosPassos>
    const situacoes: readonly string[] = ['andando', 'pulado', 'feito']
    const ids: readonly string[] = IDS_DOS_PASSOS
    if (typeof d.situacao !== 'string' || !situacoes.includes(d.situacao)) return undefined
    if (typeof d.passo !== 'string' || !ids.includes(d.passo)) return undefined
    return {
      situacao: d.situacao as MarcaDosPassos['situacao'],
      passo: d.passo as IdDoPasso,
      ...(d.obraPendente ? { obraPendente: true } : {}),
    }
  } catch {
    return undefined
  }
}

/**
 * Começa sozinho? Só para quem ainda não tem a geladeira (quem já joga vê pelo menu), nunca no
 * suporte nem na casa do irmão. Pulado ou feito, só pelo menu; parado no meio, continua. Sem
 * armazenamento no aparelho (`marca === null`), só num jogo novo, como a abertura.
 */
export function deveComecarSozinho(e: {
  marca: MarcaDosPassos | undefined | null
  temGeladeira: boolean
  jogoNovo: boolean
  somenteLeitura: boolean
  visitando: boolean
}): boolean {
  if (e.somenteLeitura || e.visitando) return false
  if (e.marca === null) return e.jogoNovo && !e.temGeladeira
  if (e.marca) return e.marca.situacao === 'andando'
  return !e.temGeladeira
}

/** Os carimbos do cartão do fim ("O que você já sabe"). */
export function carimbosDoFim(geladeiraPosta: boolean): string[] {
  const base = ['Andar e olhar', 'Pular', 'Usar as coisas', 'Plantar e colher', 'Menu e mapa']
  return geladeiraPosta ? [...base, 'Construir'] : base
}
