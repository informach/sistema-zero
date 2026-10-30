import {
  type JogoDoMural,
  JogosDoMuralSchema,
  type Plataforma,
} from '@sistemazero/arquipelago-contracts'
import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'
import type { LojaDoJogo } from './loja'

/** Só leitura. Publicações não viram cópias no salvamento nem concedem recompensas. */
export function criarListaDoMural(plataforma: Plataforma) {
  let pendente: Promise<void> | null = null
  const estado = createStore<{ lista: JogoDoMural[]; situacao: 'carregando' | 'pronta' | 'erro' }>(
    () => ({
      lista: [],
      situacao: 'carregando',
    }),
  )
  const carregar = () => {
    if (pendente) return pendente
    estado.setState({ lista: [], situacao: 'carregando' })
    pendente = (async () => {
      try {
        const r = await plataforma.servico.buscar('/mural')
        if (r.status !== 200) throw new Error('indisponivel')
        const { jogos } = JogosDoMuralSchema.parse(r.corpo)
        estado.setState({ lista: jogos, situacao: 'pronta' })
      } catch {
        estado.setState({ lista: [], situacao: 'erro' })
      } finally {
        pendente = null
      }
    })()
    return pendente
  }
  return { estado, carregar }
}
const lojas = new WeakMap<LojaDoJogo, ReturnType<typeof criarListaDoMural>>()
export function lojaDoMural(loja: LojaDoJogo, plataforma: Plataforma) {
  let atual = lojas.get(loja)
  if (!atual) {
    atual = criarListaDoMural(plataforma)
    lojas.set(loja, atual)
  }
  return atual
}
export function useMural<T>(
  fonte: ReturnType<typeof criarListaDoMural>,
  seletor: (s: ReturnType<typeof fonte.estado.getState>) => T,
) {
  return useStore(fonte.estado, seletor)
}
