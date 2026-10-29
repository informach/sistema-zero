import type { GaleriaDoJogador, IdDaGaleria, Plataforma } from '@sistemazero/arquipelago-contracts'
import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'
import { lerGaleria, motivoDaRecusa, type ResultadoDaCompra } from '../sistemas/construcao/galeria'
import type { LojaDoJogo } from './loja'

/**
 * A galeria de UMA montagem (fase1-13, 29/10/2026), à parte da loja principal: o que ela já
 * comprou e o saldo vêm do serviço (`GET /galeria`) cada vez que um painel de objeto abre; comprar
 * é `POST /galeria/compras` com uma chave nova (o serviço nunca cobra duas vezes a mesma compra).
 */
export interface EstadoDaGaleria {
  dados: GaleriaDoJogador | null
  carregando: boolean
  /** A leitura falhou: o cartão diz que a galeria não abriu, sem inventar preço nem saldo. */
  fechada: boolean
  comprando: IdDaGaleria | null
  carregar(): Promise<void>
  comprar(aparencia: IdDaGaleria): Promise<ResultadoDaCompra>
}

export type LojaDaGaleria = StoreApi<EstadoDaGaleria>

const lojas = new WeakMap<LojaDoJogo, LojaDaGaleria>()

/** A loja da galeria desta montagem (uma por loja do jogo, criada na primeira vez). */
export function lojaDaGaleria(loja: LojaDoJogo, plataforma: Plataforma): LojaDaGaleria {
  const feita = lojas.get(loja)
  if (feita) return feita
  const nova = criarLojaDaGaleria(plataforma)
  lojas.set(loja, nova)
  return nova
}

export function criarLojaDaGaleria(plataforma: Plataforma): LojaDaGaleria {
  let pedido = 0
  return createStore<EstadoDaGaleria>((set, get) => ({
    dados: null,
    carregando: false,
    fechada: false,
    comprando: null,
    async carregar() {
      const meu = ++pedido
      set({ carregando: true })
      try {
        const r = await plataforma.servico.buscar('/galeria')
        if (meu !== pedido) return
        const dados = r.status === 200 ? lerGaleria(r.corpo) : null
        // Falha de leitura preserva o que já se sabia (o que ela comprou não some da tela).
        set(
          dados
            ? { dados, carregando: false, fechada: false }
            : { carregando: false, fechada: true },
        )
      } catch (erro) {
        if (meu !== pedido) return
        plataforma.relatarErro(erro, 'galeria')
        set({ carregando: false, fechada: true })
      }
    },
    async comprar(aparencia) {
      if (get().comprando) return { ok: false, motivo: 'fora-do-ar' }
      set({ comprando: aparencia })
      try {
        const r = await plataforma.servico.buscar('/galeria/compras', {
          metodo: 'POST',
          corpo: { aparencia, chave: crypto.randomUUID() },
        })
        const dados = r.status === 200 ? lerGaleria(r.corpo) : null
        if (dados) {
          pedido++
          set({ dados, fechada: false })
          return { ok: true }
        }
        const recusa = motivoDaRecusa(r.status, r.corpo)
        // Saldo curto: o cartão passa a mostrar quanto falta com o saldo de agora.
        const atual = get().dados
        if (recusa.ok === false && recusa.motivo === 'saldo' && recusa.saldo !== null && atual)
          set({ dados: { ...atual, saldo: recusa.saldo } })
        return recusa
      } catch (erro) {
        plataforma.relatarErro(erro, 'galeria-comprar')
        return { ok: false, motivo: 'fora-do-ar' }
      } finally {
        set({ comprando: null })
      }
    },
  }))
}

export function useGaleria<T>(loja: LojaDaGaleria, seletor: (s: EstadoDaGaleria) => T): T {
  return useStore(loja, seletor)
}
