import type { CartasDoJogador, Plataforma } from '@sistemazero/arquipelago-contracts'
import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'
import {
  lerCartas,
  type MotivoDoCadernoFechado,
  motivoDoCadernoFechado,
} from '../sistemas/caderno-dos-lumis'
import type { LojaDoJogo } from './loja'

/** O valor de `painelAberto` do caderno dos Lumis. */
export const PAINEL_DO_CADERNO = 'caderno'

/**
 * Os cartões dos Lumis de UMA montagem, à parte da loja principal: a coleção vem do serviço
 * (`GET /cartas`) cada vez que o caderno abre, porque um curso concluído no meio do jogo libera
 * cartões novos.
 */
export interface EstadoDasCartas {
  dados: CartasDoJogador | null
  carregando: boolean
  fechado: MotivoDoCadernoFechado | null
  carregar(): Promise<void>
  cancelar(): void
}

export type LojaDasCartas = StoreApi<EstadoDasCartas>

const lojas = new WeakMap<LojaDoJogo, LojaDasCartas>()

/** A loja dos cartões desta montagem (uma por loja do jogo, criada na primeira vez). */
export function lojaDasCartas(loja: LojaDoJogo, plataforma: Plataforma): LojaDasCartas {
  const feita = lojas.get(loja)
  if (feita) return feita
  const nova = criarLojaDasCartas(plataforma)
  lojas.set(loja, nova)
  return nova
}

export function criarLojaDasCartas(plataforma: Plataforma): LojaDasCartas {
  let pedido = 0
  let requisicao: AbortController | null = null
  return createStore<EstadoDasCartas>((set) => ({
    dados: null,
    carregando: false,
    fechado: null,
    cancelar() {
      pedido++
      requisicao?.abort()
      requisicao = null
      set({ carregando: false })
    },
    async carregar() {
      const meu = ++pedido
      requisicao?.abort()
      const controller = new AbortController()
      requisicao = controller
      const prazo = setTimeout(() => controller.abort(), 15_000)
      set({ carregando: true })
      try {
        const r = await plataforma.servico.buscar('/cartas', { sinal: controller.signal })
        if (meu !== pedido) return
        const dados = r.status === 200 ? lerCartas(r.corpo) : null
        // Rede indisponível preserva a coleção; acesso revogado retira os dados antigos.
        if (!dados)
          set({
            carregando: false,
            fechado: motivoDoCadernoFechado(r.status),
            ...(r.status === 403 ? { dados: null } : {}),
          })
        else set({ dados, carregando: false, fechado: null })
      } catch (erro) {
        if (meu !== pedido) return
        plataforma.relatarErro(erro, 'cartas')
        set({ carregando: false, fechado: 'fora-do-ar' })
      } finally {
        clearTimeout(prazo)
        if (requisicao === controller) requisicao = null
      }
    },
  }))
}

export function useCartas<T>(loja: LojaDasCartas, seletor: (s: EstadoDasCartas) => T): T {
  return useStore(loja, seletor)
}
