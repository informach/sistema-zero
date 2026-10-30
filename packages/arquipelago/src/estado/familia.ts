import type { IrmaoParaOJogo, Plataforma } from '@sistemazero/arquipelago-contracts'
import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'
import {
  type LeituraDaCasa,
  type LeituraDaCasaDeAmigo,
  type LeituraDasCasasDeAmigos,
  type LeituraDosIrmaos,
  leituraDaCasa,
  leituraDaCasaDeAmigo,
  leituraDasCasasDeAmigos,
  leituraDosIrmaos,
} from '../sistemas/visitas'
import type { LojaDoJogo } from './loja'

/**
 * Os irmãos de UMA montagem (fase3-12), à parte da loja principal: a lista vem do serviço do jogo
 * (`GET /irmaos`, com o nome posto pelo BFF) cada vez que o resultado de uma corrida ou o painel
 * das visitas abre, porque os responsáveis podem desligar as visitas a qualquer hora.
 */
export interface EstadoDaFamilia {
  leitura: LeituraDosIrmaos | null
  carregando: boolean
  /** O irmão cuja casa está abrindo agora. */
  abrindo: string | null
  carregar(): Promise<void>
  /** Pede a casa do irmão (`GET /irmaos/:perfilId/casa`). */
  abrirCasa(irmao: IrmaoParaOJogo): Promise<LeituraDaCasa>
  /** As casas de amigos que a família aceitou (N08a, `GET /amigos`). */
  amigos: LeituraDasCasasDeAmigos | null
  carregarAmigos(): Promise<void>
  abrirCasaDeAmigo(id: string): Promise<LeituraDaCasaDeAmigo>
}

export type LojaDaFamilia = StoreApi<EstadoDaFamilia>

const lojas = new WeakMap<LojaDoJogo, LojaDaFamilia>()

export function lojaDaFamilia(loja: LojaDoJogo, plataforma: Plataforma): LojaDaFamilia {
  const feita = lojas.get(loja)
  if (feita) return feita
  const nova = criarLojaDaFamilia(plataforma)
  lojas.set(loja, nova)
  return nova
}

export function criarLojaDaFamilia(plataforma: Plataforma): LojaDaFamilia {
  let pedido = 0
  let pedidoDosAmigos = 0
  return createStore<EstadoDaFamilia>((set) => ({
    amigos: null,
    async carregarAmigos() {
      const meu = ++pedidoDosAmigos
      try {
        const r = await plataforma.servico.buscar('/amigos')
        if (meu !== pedidoDosAmigos) return
        set({ amigos: leituraDasCasasDeAmigos(r.status, r.corpo) })
      } catch (erro) {
        if (meu !== pedidoDosAmigos) return
        plataforma.relatarErro(erro, 'amigos')
        set({ amigos: { tipo: 'fora-do-ar' } })
      }
    },
    async abrirCasaDeAmigo(id) {
      set({ abrindo: id })
      try {
        const r = await plataforma.servico.buscar(`/amigos/${id}/casa`)
        const lido = leituraDaCasaDeAmigo(r.status, r.corpo, id)
        if (lido.tipo === 'desligado') set({ amigos: { tipo: 'desligado' } })
        return lido
      } catch (erro) {
        plataforma.relatarErro(erro, 'casa-de-amigo')
        return { tipo: 'nao-abriu' }
      } finally {
        set({ abrindo: null })
      }
    },
    leitura: null,
    carregando: false,
    abrindo: null,
    async carregar() {
      const meu = ++pedido
      set({ carregando: true })
      try {
        const r = await plataforma.servico.buscar('/irmaos')
        if (meu !== pedido) return
        set({ leitura: leituraDosIrmaos(r.status, r.corpo), carregando: false })
      } catch (erro) {
        if (meu !== pedido) return
        plataforma.relatarErro(erro, 'irmaos')
        set({ leitura: { tipo: 'fora-do-ar' }, carregando: false })
      }
    },
    async abrirCasa(irmao) {
      set({ abrindo: irmao.perfilId })
      try {
        const r = await plataforma.servico.buscar(`/irmaos/${irmao.perfilId}/casa`)
        const lido = leituraDaCasa(r.status, r.corpo, irmao.perfilId)
        // Desligaram no meio: a lista também passa a dizer.
        if (lido.tipo === 'desligado') set({ leitura: { tipo: 'desligado' } })
        return lido
      } catch (erro) {
        plataforma.relatarErro(erro, 'casa-do-irmao')
        return { tipo: 'nao-abriu' }
      } finally {
        set({ abrindo: null })
      }
    },
  }))
}

export function useFamilia<T>(loja: LojaDaFamilia, seletor: (s: EstadoDaFamilia) => T): T {
  return useStore(loja, seletor)
}
