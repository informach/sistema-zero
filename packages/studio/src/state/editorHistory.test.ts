import { describe, expect, it, mock } from 'bun:test'
import { createEditorHistory, type EditorHistoryAdapter, historyTargetFor } from './editorHistory'

function fakeAdapter(): EditorHistoryAdapter & { emit(): void } {
  const listeners = new Set<() => void>()
  return {
    undo: mock(() => {}),
    redo: mock(() => {}),
    canUndo: () => true,
    canRedo: () => false,
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    emit() {
      for (const listener of listeners) listener()
    },
  }
}

describe('editorHistory: o registro das pilhas de desfazer de uma instância', () => {
  it('um editor registrado aparece pelo alvo e some quando sai', () => {
    const history = createEditorHistory()
    const blocks = fakeAdapter()
    expect(history.get('blocks')).toBeNull()
    const unregister = history.register('blocks', blocks)
    expect(history.get('blocks')).toBe(blocks)
    expect(history.get('code')).toBeNull()
    unregister()
    expect(history.get('blocks')).toBeNull()
  })

  it('avisa a barra quando um editor entra, sai, a pilha muda ou o alvo troca', () => {
    const history = createEditorHistory()
    const heard = mock(() => {})
    history.subscribe(heard)
    const blocks = fakeAdapter()
    const antes = history.getVersion()

    const unregister = history.register('blocks', blocks)
    blocks.emit()
    history.markActive('code')
    // Tocar de novo no MESMO editor não é mudança.
    history.markActive('code')
    unregister()

    expect(heard).toHaveBeenCalledTimes(4)
    expect(history.getVersion()).toBe(antes + 4)
    // Saiu do registro = parou de ouvir a pilha dele.
    blocks.emit()
    expect(heard).toHaveBeenCalledTimes(4)
  })

  it('a saída de um editor antigo não derruba o novo do mesmo alvo (remontagem wide ⇄ narrow)', () => {
    const history = createEditorHistory()
    const antigo = fakeAdapter()
    const novo = fakeAdapter()
    const sairAntigo = history.register('code', antigo)
    history.register('code', novo)
    sairAntigo()
    expect(history.get('code')).toBe(novo)
  })

  it('o alvo: blocos no modo Blocos, código no Código e, na Ponte, o último tocado (blocos antes)', () => {
    expect(historyTargetFor('blocks', 'code')).toBe('blocks')
    expect(historyTargetFor('code', 'blocks')).toBe('code')
    expect(historyTargetFor('bridge', null)).toBe('blocks')
    expect(historyTargetFor('bridge', 'code')).toBe('code')
    expect(historyTargetFor('bridge', 'blocks')).toBe('blocks')
  })

  it('duas instâncias não se misturam', () => {
    const uma = createEditorHistory()
    const outra = createEditorHistory()
    uma.register('blocks', fakeAdapter())
    uma.markActive('code')
    expect(outra.get('blocks')).toBeNull()
    expect(outra.lastActive()).toBeNull()
  })
})
