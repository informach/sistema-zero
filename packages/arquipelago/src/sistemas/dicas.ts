import type { Anel, Entrada } from './primeiros-passos'

/**
 * As dicas de primeira vez (proposta "Primeiros passos", 30/10/2026): quando a criança chega numa
 * coisa nova, o Zappy explica ali mesmo, em uma a três falas, uma vez só por perfil no aparelho.
 * Explicam e mostram o lugar (o anel); nunca pedem tarefa. O que dispara cada uma mora no mundo e
 * na HUD; aqui ficam os textos e as regras.
 */
export const IDS_DAS_DICAS = [
  'quadro',
  'quadro-painel',
  'barco',
  'barco-chegada',
  'lanterna',
  'borrao',
  'lumi',
  'noite',
] as const

export type IdDaDica = (typeof IDS_DAS_DICAS)[number]

/** O que as falas podem depender: o jeito de jogar e o que a criança já tem. */
export interface ContextoDaDica {
  entrada: Entrada
  /** O barco saiu do porto da sua ilha (vai ao Recife) ou do Recife (volta para casa). */
  barcoDeCasa: boolean
  vilaAberta: boolean
  temLanterna: boolean
  energiaBaixa: boolean
  temCama: boolean
  /** As falas que tocam na jornada vêm da voz (Kids ou adulto). */
  falaDoCurso: string
}

export interface Fala {
  texto: string
  anel?: Anel
}

export interface Dica {
  /** O nome na lista "Dicas que você já viu" do menu. */
  nome: string
  falas: (c: ContextoDaDica) => Fala[]
  /** O painel por cima do qual esta dica pode aparecer (o Quadro das Cores aberto). */
  sobrePainel?: boolean
}

const usar = (e: Entrada, teclado: string, toque: string, controle: string) =>
  e === 'toque' ? toque : e === 'controle' ? controle : teclado

export const DICAS: Readonly<Record<IdDaDica, Dica>> = {
  quadro: {
    nome: 'O Quadro das Cores',
    falas: (c) => [
      {
        texto: 'Esse é o Quadro das Cores. Cada quadro é um desafio de programar no Estúdio.',
        anel: 'acao',
      },
      {
        texto: 'Cada desafio feito pinta um pedaço da ilha. São seis, um para cada quadro.',
        anel: 'quadro',
      },
      { texto: c.falaDoCurso },
    ],
  },
  'quadro-painel': {
    nome: 'O desafio de hoje',
    falas: () => [
      // Retorno de quem testou (01/11/2026): primeiro o quadrinho que explica o Quadro.
      {
        texto: 'O quadrinho Como funciona mostra o que cada desafio pinta na ilha.',
        anel: 'quadro-como',
      },
      { texto: 'Todo dia tem um desafio de hoje, aqui em cima.', anel: 'desafio-de-hoje' },
    ],
    sobrePainel: true,
  },
  barco: {
    nome: 'O barco',
    falas: (c) => [
      {
        texto: c.barcoDeCasa
          ? usar(
              c.entrada,
              'Esse barco leva você até o Recife Coral. Aperte E para embarcar.',
              'Esse barco leva você até o Recife Coral. Toque em Usar para embarcar.',
              'Esse barco leva você até o Recife Coral. Aperte o botão da direita para embarcar.',
            )
          : usar(
              c.entrada,
              'Esse barco leva você de volta para a sua ilha. Aperte E para embarcar.',
              'Esse barco leva você de volta para a sua ilha. Toque em Usar para embarcar.',
              'Esse barco leva você de volta para a sua ilha. Aperte o botão da direita para embarcar.',
            ),
        anel: 'acao',
      },
      { texto: 'Na viagem você fica no barco, sem cair no mar. Ele para sozinho no cais.' },
    ],
  },
  'barco-chegada': {
    nome: 'A volta de barco',
    falas: () => [{ texto: 'Para voltar para casa, embarque de novo aqui no cais.' }],
  },
  lanterna: {
    nome: 'A lanterna',
    falas: () => [
      {
        texto:
          'Essa lanterna acende e apaga na mochila. De noite, ela ajuda a prender os borrões da Vila.',
        anel: 'mochila',
      },
    ],
  },
  borrao: {
    nome: 'Os borrões da noite',
    falas: (c) => [
      { texto: 'Esses borrões só aparecem de noite. Com a lanterna acesa, eles não fogem.' },
      {
        texto: usar(
          c.entrada,
          'Com a luz bem perto, aperte E para prender o borrão.',
          'Com a luz bem perto, toque em Usar para prender o borrão.',
          'Com a luz bem perto, aperte o botão da direita para prender o borrão.',
        ),
        anel: 'acao',
      },
    ],
  },
  lumi: {
    nome: 'O primeiro Lumi',
    falas: () => [
      { texto: 'Agora ele mora na Vila Doce. Chegue perto dele para ensinar uma rotina.' },
      { texto: 'Os cartões das rotinas ficam no Caderno dos Lumis, no menu.', anel: 'menu' },
    ],
  },
  noite: {
    nome: 'A primeira noite',
    falas: (c) => {
      const falas: Fala[] = [
        {
          texto:
            'Anoiteceu. A noite passa rápido, em uns quatro minutos, e nada se perde no escuro.',
          anel: 'relogio',
        },
      ]
      // Só uma, a que combina com o jogo dela: a cama quando falta energia, senão a Vila.
      if (c.energiaBaixa && c.temCama)
        falas.push({ texto: 'Sua energia está baixinha. Deite na cama do quarto para descansar.' })
      else if (c.vilaAberta && c.temLanterna)
        falas.push({
          texto: 'De noite aparecem borrões na praça da Vila Doce. Leve a lanterna acesa.',
        })
      else if (c.vilaAberta)
        falas.push({
          texto: 'Converse com o Bento na Vila Doce. Ele guarda uma lanterna para você.',
        })
      return falas
    },
  },
}

/** O que fica no aparelho, por público e perfil: as dicas já vistas e se estão desligadas. */
export interface MarcaDasDicas {
  vistas: IdDaDica[]
  desligadas: boolean
}

export const SEM_DICAS_VISTAS: MarcaDasDicas = { vistas: [], desligadas: false }

export function chaveDasDicas(publico: string, perfil: string): string {
  return `arquipelago:dicas:${publico}:${perfil}`
}

export function lerMarcaDasDicas(texto: string | null): MarcaDasDicas {
  if (!texto) return SEM_DICAS_VISTAS
  try {
    const d = JSON.parse(texto) as Partial<MarcaDasDicas>
    const ids: readonly string[] = IDS_DAS_DICAS
    const vistas = Array.isArray(d.vistas)
      ? (d.vistas.filter((v) => typeof v === 'string' && ids.includes(v)) as IdDaDica[])
      : []
    return { vistas: [...new Set(vistas)], desligadas: d.desligadas === true }
  } catch {
    return SEM_DICAS_VISTAS
  }
}

/**
 * A dica entra na fila? Só se ainda não foi vista, se as dicas estão ligadas e se não está na
 * fila. Rever pelo menu passa por cima de tudo isso.
 */
export function podeMostrar(
  id: IdDaDica,
  marca: MarcaDasDicas,
  fila: readonly IdDaDica[],
): boolean {
  return !marca.desligadas && !marca.vistas.includes(id) && !fila.includes(id)
}
