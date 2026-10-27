import type { Plataforma } from '@sistemazero/arquipelago-contracts'
import { createContext, useContext } from 'react'
import { useStore } from 'zustand'
import type { Controle } from '../controles/controle'
import type { RegistroDeInterativos } from '../mundo/interativos'
import type { criarFilaDeTempo } from '../sistemas/fila-tempo'
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
}

export interface ContextoDoJogo {
  loja: LojaDoJogo
  plataforma: Plataforma
  filaTempo: Awaited<ReturnType<typeof criarFilaDeTempo>> | null
  controle: Controle
  interativos: RegistroDeInterativos
  rastro: Rastro
  ambiente: Ambiente
  pedidos: Pedidos
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
