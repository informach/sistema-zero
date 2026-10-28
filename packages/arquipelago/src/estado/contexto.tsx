import type { Plataforma } from '@sistemazero/arquipelago-contracts'
import { createContext, useContext } from 'react'
import { useStore } from 'zustand'
import type { Controle } from '../controles/controle'
import type { RegistroDeInterativos } from '../mundo/interativos'
import type { Balanco, Ponto } from '../sistemas/cipo'
import type { Tronco } from '../sistemas/escalada'
import type { criarGerenteTempo } from '../sistemas/gerente-tempo'
import type { Corrida } from '../sistemas/percurso'
import type { EstadoDoJogo, LojaDoJogo } from './loja'

/** Posição do personagem, lida a cada quadro pela câmera e pelo Zappy (fora do React). */
export interface Rastro {
  x: number
  y: number
  z: number
  /** Para onde a câmera olha (giro em torno do personagem). */
  giro: number
  inclinacao: number
  /** Para onde o avatar está virado (giro `d` olha para `(sin d, cos d)`), escrito pelo personagem. */
  direcao: number
  /** Velocidade pedida no chão (m/s): zero parado, mesmo encostado numa parede andando. */
  velocidade: number
  /** Onde o Zappy está agora (lido pelas copas que esmaecem na frente dele). */
  zappy: { x: number; y: number; z: number }
}

/** Luz do dia, escrita pelo céu a cada quadro e lida por janelas, Zappy e Farol. */
export interface Ambiente {
  luz: number
  noite: boolean
}

/** Pedidos de fora para o personagem (o cochilo leva de volta para casa). */
export interface Pedidos {
  teleporte: { x: number; y: number; z: number } | null
  /**
   * Ilhas cujo chão de verdade ainda está chegando com o personagem em cima delas (o jogo abriu
   * com ele num deque da ilha completa): enquanto houver alguma, ele fica parado no ar em vez de
   * cair até a versão leve.
   */
  chaoChegando: Set<string>
  /** Para onde olhar depois do teleporte (o giro do avatar); `null` mantém. */
  olharPara: number | null
}

/** Um cipó que dá para pegar (a ilha completa registra os dela enquanto está ativa). */
export interface CipoVivo {
  id: string
  /** Onde ele se prende no galho, no mundo. */
  pivo: Ponto
  /** Do pivô até o fim da corda desenhada. */
  corda: number
  /** Do pivô até onde as mãos seguram (os pés passam livres do chão). */
  pegada: number
  /** A pose do balanço: o personagem mexe enquanto segura; solto, a ilha deixa ele parar. */
  balanco: Balanco
  seguro: boolean
  /** `performance.now()` da última vez que alguém soltou (para não pegar de novo na hora). */
  soltoEm: number
}

/** Uma água rasa de ilha completa (o lago do Bosque): uma elipse no chão, onde se nada. */
export interface AguaRasa {
  id: string
  x: number
  z: number
  raioX: number
  raioZ: number
  /** O giro da elipse no mundo (o da ilha). */
  giro: number
  /** A altura da superfície. */
  y: number
}

export interface TroncoVivo {
  id: string
  tronco: Tronco
}

export type ModoDoCorpo = 'chao' | 'cipo' | 'escalada'

/**
 * Cipós, troncos de escalar e águas rasas das ilhas completas, e o que o personagem faz com eles
 * (mutável, lido a cada quadro fora do React). Listas simples: o laço da física percorre sem
 * alocar.
 */
export interface Movimento {
  cipos: CipoVivo[]
  troncos: TroncoVivo[]
  aguas: AguaRasa[]
  /** Pedido de um interativo ("Pegar o cipó", "Escalar"): o personagem atende no quadro seguinte. */
  pedido: { tipo: 'cipo' | 'tronco'; id: string } | null
  /** Escritos pelo personagem. */
  modo: ModoDoCorpo
  /** Pisando em algo (chão, deque, ponte); falso no ar, no cipó e no tronco. */
  noChao: boolean
  /** Para onde a câmera olha no balanço (perto do meio do cipó). */
  foco: Ponto
  /** A corrida do percurso em andamento (o cronômetro lê o tempo daqui). */
  corrida: Corrida | null
  /** Pedido da tela para o percurso: correr de novo ou parar. */
  pedidoDoPercurso: 'recomecar' | 'parar' | null
}

export function criarMovimento(): Movimento {
  return {
    cipos: [],
    troncos: [],
    aguas: [],
    pedido: null,
    modo: 'chao',
    noChao: false,
    foco: { x: 0, y: 0, z: 0 },
    corrida: null,
    pedidoDoPercurso: null,
  }
}

export interface ContextoDoJogo {
  loja: LojaDoJogo
  plataforma: Plataforma
  gerenteTempo: ReturnType<typeof criarGerenteTempo> | null
  controle: Controle
  interativos: RegistroDeInterativos
  rastro: Rastro
  ambiente: Ambiente
  pedidos: Pedidos
  movimento: Movimento
}

export const Contexto = createContext<ContextoDoJogo | null>(null)

export function useJogo(): ContextoDoJogo {
  const c = useContext(Contexto)
  if (!c) throw new Error('Fora do Arquipélago')
  return c
}

export function useEstado<T>(seletor: (s: EstadoDoJogo) => T): T {
  return useStore(useJogo().loja, seletor)
}
