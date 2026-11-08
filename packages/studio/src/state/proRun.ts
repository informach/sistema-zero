import { useContext } from 'react'
import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'
import { StudioStoresContext } from './storesContext'

/**
 * O estado de EXECUÇÃO do projeto Pro, publicado pela prévia que estiver montada (o dev-server
 * do WebContainer, o build remoto ou o controlador Python) e lido por quem fica FORA dela: o
 * Rodar/Parar da Topbar, a pílula de estado do palco, o cartão de espera, a barra de abas do
 * celular. Antes de 11/2026 cada prévia guardava a fase num `useState` próprio e a Topbar não
 * tinha como saber se o jogo estava rodando.
 *
 * Fases, na língua da criança: `idle` (parado, nada rodando), `preparing` (os três passos da
 * oficina), `running`, `waiting` (o `input()` do Python esperando a resposta), `done` (o
 * programa terminou sozinho), `error` (parou com um problema) e `unsupported` (o navegador não
 * roda o modo Código). `null` em `state` = nenhuma prévia ativa (o palco escondido, a proposta
 * do construtor na tela, o projeto trocando).
 */
export type ProRunPhase =
  | 'idle'
  | 'preparing'
  | 'running'
  | 'waiting'
  | 'done'
  | 'error'
  | 'unsupported'

export interface ProRunState {
  phase: ProRunPhase
  /** Só em `preparing`: qual dos passos nomeados está em andamento (o remoto tem um só). */
  step?: { index: number; total: number }
  /** O jogo rodando/compilado é mais velho que o código do editor. */
  stale?: boolean
  canRun: boolean
  canStop: boolean
  /** O texto técnico de sempre ("Subindo o servidor de desenvolvimento (Vite)…"), para "Ver detalhes". */
  detail?: string
  /** A cauda de log do npm/dev-server, para "Ver detalhes". */
  logTail?: readonly string[]
  /** A mensagem de erro técnica, quando `phase === 'error'`. */
  error?: string
}

export interface ProRunActions {
  /** Começa (parado) ou recomeça (rodando): é o Rodar / Rodar de novo. */
  run(): void
  stop(): void
  /** Recarrega o jogo sem reiniciar o servidor (só o dev-server local e o build remoto). */
  reload?(): void
}

export interface ProRunStore {
  state: ProRunState | null
  actions: ProRunActions | null
  /** A prévia publica estado e ações juntos; `null` nos dois quando sai de cena. */
  publish(state: ProRunState | null, actions: ProRunActions | null): void
  /**
   * Traz o palco à vista (sai de "Só o código", no celular abre a aba do jogo). Registrado
   * pelo layout do workspace Pro; a Topbar chama junto com `actions.run()`.
   */
  revealStage: (() => void) | null
  setRevealStage(reveal: (() => void) | null): void
}

export function createProRunStore(): StoreApi<ProRunStore> {
  return createStore<ProRunStore>((set) => ({
    state: null,
    actions: null,
    publish: (state, actions) => set({ state, actions }),
    revealStage: null,
    setRevealStage: (revealStage) => set({ revealStage }),
  }))
}

const defaultProRunStore = createProRunStore()

type BoundUseProRun = (<T>(selector: (s: ProRunStore) => T) => T) & StoreApi<ProRunStore>

/**
 * Hook por instância: lê a store do <Studio> mais próximo; fora de um Studio cai na default de
 * módulo (contrato das outras stores: as estáticas operam sempre na default).
 */
export const useProRun: BoundUseProRun = Object.assign(function useProRunHook<T>(
  selector: (s: ProRunStore) => T,
): T {
  const stores = useContext(StudioStoresContext)
  return useStore(stores?.proRun ?? defaultProRunStore, selector)
}, defaultProRunStore)

export function useProRunApi(): StoreApi<ProRunStore> {
  const stores = useContext(StudioStoresContext)
  return stores?.proRun ?? defaultProRunStore
}

/** O rótulo do botão principal: "Rodar" parado, "Rodar de novo" com algo em andamento ou feito. */
export function proRunLabelKey(
  state: Pick<ProRunState, 'phase'> | null,
): 'run.run' | 'run.runAgain' {
  if (!state) return 'run.run'
  return state.phase === 'idle' || state.phase === 'unsupported' ? 'run.run' : 'run.runAgain'
}
