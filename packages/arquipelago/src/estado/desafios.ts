import type {
  DesafiosDoJogador,
  IlhaId,
  MoldeDeDesafio,
  Plataforma,
} from '@sistemazero/arquipelago-contracts'
import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'
import {
  lerDesafios,
  type MotivoDoQuadroFechado,
  motivoDoErro,
  novosFeitos,
  quadrosDaIlha,
} from '../sistemas/quadro-das-cores'
import type { LojaDoJogo } from './loja'

/**
 * Os desafios do jogo de UMA montagem, à parte da loja principal: a lista vem do serviço
 * (`GET /desafios`), o Estúdio de desafio abre pela plataforma e, de volta, a lista é lida de novo.
 */
export interface EstadoDosDesafios {
  dados: DesafiosDoJogador | null
  carregando: boolean
  fechado: MotivoDoQuadroFechado | null
  /** Os quadros que acabaram de ficar feitos (a festa da cor), por ilha. */
  festa: { ilha: IlhaId; quadros: number[] } | null
  carregar(): Promise<void>
  jogar(desafioId: string, revisao: number): Promise<'feito' | 'voltou' | 'nao-abriu'>
  festaVista(): void
}

export type LojaDosDesafios = StoreApi<EstadoDosDesafios>

const lojas = new WeakMap<LojaDoJogo, LojaDosDesafios>()

/** A loja dos desafios desta montagem (uma por loja do jogo, criada na primeira vez). */
export function lojaDosDesafios(loja: LojaDoJogo, plataforma: Plataforma): LojaDosDesafios {
  const feita = lojas.get(loja)
  if (feita) return feita
  const nova = criarLojaDosDesafios(loja, plataforma)
  lojas.set(loja, nova)
  return nova
}

export function criarLojaDosDesafios(loja: LojaDoJogo, plataforma: Plataforma): LojaDosDesafios {
  let pedido = 0
  return createStore<EstadoDosDesafios>((set, get) => ({
    dados: null,
    carregando: false,
    fechado: null,
    festa: null,
    async carregar() {
      const meu = ++pedido
      set({ carregando: true })
      try {
        const r = await plataforma.servico.buscar('/desafios')
        if (meu !== pedido) return
        const dados = r.status === 200 ? lerDesafios(r.corpo) : null
        if (!dados) {
          set({ carregando: false, fechado: motivoDoErro(r.status, r.corpo) })
          return
        }
        const antes = get().dados
        // Festa só para o que ficou feito AGORA (na primeira leitura não há "antes").
        let festa = get().festa
        if (antes) {
          for (const ilha of dados.ilhas) {
            const novos = novosFeitos(
              quadrosDaIlha(antes.desafios, ilha.id),
              quadrosDaIlha(dados.desafios, ilha.id),
            )
            if (novos.length > 0) festa = { ilha: ilha.id, quadros: novos }
          }
        }
        set({ dados, carregando: false, fechado: null, festa })
      } catch (erro) {
        if (meu !== pedido) return
        plataforma.relatarErro(erro, 'desafios')
        set({ carregando: false, fechado: 'fora-do-ar' })
      }
    },
    async jogar(desafioId, revisao) {
      const jogo = loja.getState()
      if (jogo.ferramentaAberta) return 'nao-abriu'
      jogo.definirFerramentaAberta(true)
      try {
        const molde: MoldeDeDesafio = { tipo: 'desafio', desafioId, revisao }
        const resultado = await plataforma.abrirFerramenta({
          ferramenta: 'estudio',
          proposito: 'desafio',
          molde,
        })
        if (resultado.situacao === 'indisponivel') return 'nao-abriu'
        // Concluído ou não, a lista é relida: a situação (e a cor) vem sempre do serviço.
        await get().carregar()
        return resultado.situacao === 'pronto' ? 'feito' : 'voltou'
      } catch (erro) {
        plataforma.relatarErro(erro, 'abrir-desafio')
        return 'nao-abriu'
      } finally {
        loja.getState().definirFerramentaAberta(false)
      }
    },
    festaVista() {
      const festa = get().festa
      if (!festa) return
      set({ festa: null })
      // O serviço guarda que a festa já foi vista (para não repetir em outro aparelho).
      const dados = get().dados
      for (const d of dados?.desafios ?? []) {
        if (d.ilha !== festa.ilha || d.quadro === null || !festa.quadros.includes(d.quadro))
          continue
        if (d.recompensaVista) continue
        void plataforma.servico
          .buscar(`/desafios/${d.id}/recompensa-vista`, { metodo: 'POST', corpo: {} })
          .catch((erro) => plataforma.relatarErro(erro, 'recompensa-vista'))
      }
    },
  }))
}

export function useDesafios<T>(loja: LojaDosDesafios, seletor: (s: EstadoDosDesafios) => T): T {
  return useStore(loja, seletor)
}
