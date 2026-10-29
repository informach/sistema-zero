import type { Ilha, MotivoDeBloqueio } from '@sistemazero/arquipelago-contracts'
import { createContext, useContext } from 'react'
import { recadoDaCompra } from '../sistemas/construcao/galeria'
import { falaDaLuneta } from '../sistemas/luneta'

/**
 * A voz das telas do jogo que falam com quem joga sobre a plataforma (abrir, voltar, a jornada,
 * o suporte). O mundo, os moradores e as falas das ilhas são os mesmos nos dois públicos; só
 * estes textos mudam. O Kids fica aqui; o adulto mora em `adulto/voz-adulta.ts`, no pedaço que
 * só a comunidade adulta baixa (`adulto/pele-adulta.ts`).
 */
export interface VozDoJogo {
  carregando: { titulo: string; texto: string }
  bloqueado: { titulo: string; motivos: Record<MotivoDeBloqueio, string> }
  descanso: { titulo: string; texto: string }
  erro: { titulo: string; texto: string }
  /** O botão que sai do jogo. */
  voltar: string
  /** O que o Zappy diz na luneta sobre a próxima ilha fechada. */
  falaDaLuneta: (ilha: Ilha) => string
  /** O Molda ainda fechado no painel do projeto azul. */
  moldaFechado: string
  /** A compra da galeria recusada porque a sessão é de suporte (só leitura). */
  compraSomenteLeitura: string
}

export const VOZ_KIDS: VozDoJogo = {
  carregando: {
    titulo: 'Acendendo o Arquipélago',
    texto: 'O Zappy está trazendo a sua casa e o seu avatar.',
  },
  bloqueado: {
    titulo: 'Quase lá',
    motivos: {
      desligado: 'O Arquipélago Vagalume ainda não abriu. A equipe avisa quando chegar a sua vez.',
      'fora-da-lista':
        'O Arquipélago Vagalume ainda não abriu para todo mundo. A equipe avisa quando chegar a sua vez.',
      'publico-desligado': 'O Arquipélago Vagalume ainda não chegou nesta comunidade.',
    },
  },
  descanso: {
    titulo: 'Hora de descansar',
    texto:
      'O tempo livre de hoje no Arquipélago acabou. A sua casa e a sua horta esperam por você amanhã.',
  },
  erro: {
    titulo: 'O Arquipélago não abriu agora',
    texto: 'Não conseguimos carregar o jogo. Tente de novo daqui a pouco.',
  },
  voltar: 'Voltar para a plataforma',
  falaDaLuneta,
  moldaFechado: 'Abre no posto Explorador(a) de Mundos',
  compraSomenteLeitura: recadoDaCompra({ ok: false, motivo: 'somente-leitura' }),
}

/** Sem provedor (testes e telas soltas), a voz é a do Kids. */
export const VozContexto = createContext<VozDoJogo>(VOZ_KIDS)

export function useVoz(): VozDoJogo {
  return useContext(VozContexto)
}
