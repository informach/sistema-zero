import type { Plataforma } from '@sistemazero/arquipelago-contracts'
import { createContext, useContext } from 'react'
import { useStore } from 'zustand'
import type { Controle } from '../controles/controle'
import type { RegistroDeInterativos } from '../mundo/interativos'
import type { criarGerenteTempo } from '../sistemas/gerente-tempo'
import type { EstadoDoJogo, LojaDoJogo } from './loja'

/** Posição do personagem, lida a cada quadro pela câmera e pelo Zappy (fora do React). */
export interface Rastro {
  x: number
  y: number
  z: number
  /** Para onde a câmera olha (giro em torno do personagem). */
  giro: number
  inclinacao: number
}

/** Luz do dia, escrita pelo céu a cada quadro e lida por janelas, Zappy e Farol. */
export interface Ambiente {
  luz: number
  noite: boolean
}

/** Pedidos de fora para o personagem (o cochilo leva de volta para casa). */
export interface Pedidos {
  teleporte: { x: number; y: number; z: number } | null
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
