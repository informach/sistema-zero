import { type Minijogo, MinijogosSchema, type Plataforma } from '@sistemazero/arquipelago-contracts'
import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'
import { falaDoGanho, ganharProjetos } from '../sistemas/construcao/projeto-azul'
import type { LojaDoJogo } from './loja'

function criar(loja: LojaDoJogo, plataforma: Plataforma) {
  let pendente: Promise<void> | null = null
  const estado = createStore<{ lista: Minijogo[]; situacao: 'carregando' | 'pronta' | 'erro' }>(
    () => ({ lista: [], situacao: 'carregando' }),
  )
  const carregar = () => {
    if (pendente) return pendente
    pendente = (async () => {
      try {
        const r = await plataforma.servico.buscar('/minijogos')
        if (r.status !== 200) throw new Error('indisponivel')
        const { minijogos } = MinijogosSchema.parse(r.corpo)
        estado.setState({ lista: minijogos, situacao: 'pronta' })
        const s = loja.getState()
        if (s.acesso.somenteLeitura) return
        const novo = ganharProjetos(s.salvamento, new Date(), minijogos.length > 0)
        if (novo.ganhos.includes('fliperama')) {
          s.mudar(() => novo.salvamento)
          s.dizer(falaDoGanho('fliperama'))
        }
      } catch {
        estado.setState({ situacao: 'erro' })
      } finally {
        pendente = null
      }
    })()
    return pendente
  }
  return { estado, carregar }
}
const lojas = new WeakMap<LojaDoJogo, ReturnType<typeof criar>>()
export function lojaDosMinijogos(loja: LojaDoJogo, plataforma: Plataforma) {
  let atual = lojas.get(loja)
  if (!atual) {
    atual = criar(loja, plataforma)
    lojas.set(loja, atual)
  }
  return atual
}
export function useMinijogos<T>(
  fonte: ReturnType<typeof lojaDosMinijogos>,
  seletor: (s: ReturnType<typeof fonte.estado.getState>) => T,
) {
  return useStore(fonte.estado, seletor)
}
