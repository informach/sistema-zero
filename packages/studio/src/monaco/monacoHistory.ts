import type * as monacoNs from 'monaco-editor'

// Só TIPOS do Monaco aqui: este módulo entra no chunk dos modos, que carregam o editor de código
// sob demanda (o `LazyMonacoTabs`). Por isso ele é importado pelo caminho, não pelo índice.

/** O que o TextModel da versão em uso (0.52) tem e a API pública não declara. */
interface UndoableModel {
  undo?: () => unknown
  redo?: () => unknown
  canUndo?: () => boolean
  canRedo?: () => boolean
}

/** O mesmo formato do `EditorHistoryAdapter` do Studio (sem importar o estado do Studio). */
export interface MonacoHistoryAdapter {
  undo(): void
  redo(): void
  canUndo(): boolean
  canRedo(): boolean
  subscribe(listener: () => void): () => void
  dispose(): void
}

/**
 * A pilha de desfazer do CÓDIGO para a barra do editor. O Ctrl+Z do Monaco é
 * `editor.getModel().undo()` (`CoreEditingCommands.Undo`), e é o que se chama aqui, direto no
 * modelo DESTE editor: pelo comando global (`editor.trigger(…, 'undo')`), sem o foco no editor,
 * o Monaco manda o desfazer para o último editor ativo da PÁGINA, que pode ser outro.
 * O modelo real sabe se há o que desfazer (`canUndo`/`canRedo`), só não o declara no `.d.ts`:
 * sem esses métodos (outra versão do Monaco), cai no comando e o botão fica sempre ligado.
 */
export function createMonacoHistory(
  editor: monacoNs.editor.IStandaloneCodeEditor,
): MonacoHistoryAdapter {
  const listeners = new Set<() => void>()
  const notify = () => {
    for (const listener of [...listeners]) listener()
  }

  const model = () => editor.getModel() as (monacoNs.editor.ITextModel & UndoableModel) | null
  const readOnly = () => editor.getRawOptions().readOnly === true
  const can = (kind: 'canUndo' | 'canRedo') => {
    const current = model()
    if (!current || readOnly()) return false
    return typeof current[kind] === 'function' ? current[kind]() : true
  }

  // A barra só é avisada quando o que dá para desfazer ou refazer MUDA, como no adaptador do
  // Blockly: cada aviso sobe a versão do registro e re-renderiza a barra inteira, e avisar a cada
  // tecla fazia isso a cada letra digitada na Ponte e no modo Código (full review de 11/09/2026).
  // Trocar de aba é outro arquivo e outra pilha: avisa sempre.
  const state = () => `${can('canUndo')}|${can('canRedo')}`
  let last = state()
  const notifyIfChanged = () => {
    const next = state()
    if (next === last) return
    last = next
    notify()
  }
  const subscriptions = [
    editor.onDidChangeModelContent(notifyIfChanged),
    editor.onDidChangeModel(() => {
      last = state()
      notify()
    }),
  ]

  const run = (kind: 'undo' | 'redo') => {
    const current = model()
    if (!current || readOnly()) return
    if (typeof current[kind] === 'function') {
      void current[kind]()
    } else {
      editor.focus()
      editor.trigger('sz-topbar', kind, null)
    }
    notifyIfChanged()
  }

  return {
    undo: () => run('undo'),
    redo: () => run('redo'),
    canUndo: () => can('canUndo'),
    canRedo: () => can('canRedo'),
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    dispose() {
      for (const subscription of subscriptions) subscription.dispose()
      listeners.clear()
    },
  }
}
