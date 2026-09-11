import type { IDEMode } from '#core'

/** Os editores de uma instância que têm pilha própria de desfazer. */
export type EditorHistoryTarget = 'blocks' | 'code'

/** O que cada editor entrega: a pilha dele, sem expor o Blockly nem o Monaco à barra. */
export interface EditorHistoryAdapter {
  undo(): void
  redo(): void
  canUndo(): boolean
  canRedo(): boolean
  /** Avisa quando as pilhas mudam (é o que liga e desliga os botões). */
  subscribe(listener: () => void): () => void
}

export interface EditorHistory {
  /** Um editor montado entrega a pilha dele; a devolução o retira. */
  register(target: EditorHistoryTarget, adapter: EditorHistoryAdapter): () => void
  get(target: EditorHistoryTarget): EditorHistoryAdapter | null
  /** A criança tocou (ou focou) este editor. Só um gesto dela troca o alvo da Ponte. */
  markActive(target: EditorHistoryTarget): void
  lastActive(): EditorHistoryTarget | null
  /** Qualquer mudança (registro, alvo, pilhas), para o `useSyncExternalStore` da barra. */
  subscribe(listener: () => void): () => void
  getVersion(): number
}

/**
 * Desfazer e refazer da barra do editor (11/09/2026, a tela-modelo do Estúdio). Cada editor da
 * instância REGISTRA aqui a pilha dele (os blocos no `BlocklyPanel`, o código no `MonacoTabs`) e
 * a barra decide com quem os botões falam (`historyTargetFor`). Por instância, no molde do
 * `pendingEditorEdits`: dois Studios na mesma página não desfazem um o outro.
 */
export function createEditorHistory(): EditorHistory {
  const entries = new Map<
    EditorHistoryTarget,
    { adapter: EditorHistoryAdapter; unsubscribe: () => void }
  >()
  const listeners = new Set<() => void>()
  let active: EditorHistoryTarget | null = null
  let version = 0

  const notify = () => {
    version += 1
    for (const listener of [...listeners]) listener()
  }

  return {
    register(target, adapter) {
      entries.get(target)?.unsubscribe()
      const entry = { adapter, unsubscribe: adapter.subscribe(notify) }
      entries.set(target, entry)
      notify()
      return () => {
        // Um editor novo do mesmo alvo (o wide virando narrow remonta os painéis) pode ter
        // registrado antes de o antigo sair: a saída do antigo não derruba o novo.
        if (entries.get(target) !== entry) return
        entry.unsubscribe()
        entries.delete(target)
        notify()
      }
    },
    get: (target) => entries.get(target)?.adapter ?? null,
    markActive(target) {
      if (active === target) return
      active = target
      notify()
    },
    lastActive: () => active,
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    getVersion: () => version,
  }
}

/**
 * Com quem os botões falam: os blocos no modo Blocos, o código no modo Código e, na Ponte, o
 * último editor que a criança tocou (os blocos até ela tocar no código).
 */
export function historyTargetFor(
  mode: IDEMode,
  lastActive: EditorHistoryTarget | null,
): EditorHistoryTarget {
  if (mode === 'blocks') return 'blocks'
  if (mode === 'code') return 'code'
  return lastActive ?? 'blocks'
}
