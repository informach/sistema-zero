import { describe, expect, it, mock } from 'bun:test'
import type * as monacoNs from 'monaco-editor'
import { createMonacoHistory } from '../monacoHistory'

/**
 * A pilha do CÓDIGO na barra do editor. O Monaco de verdade não roda no happy-dom: aqui o editor
 * é falso, com a mesma superfície que o adaptador usa (o modelo com `undo`/`canUndo`, que o
 * TextModel da versão em uso tem e o `.d.ts` não declara).
 */
function fakeEditor(model: Record<string, unknown> | null, options: { readOnly?: boolean } = {}) {
  const content = new Set<() => void>()
  const modelChange = new Set<() => void>()
  const editor = {
    getModel: () => model,
    getRawOptions: () => ({ readOnly: options.readOnly ?? false }),
    focus: mock(() => {}),
    trigger: mock(() => {}),
    onDidChangeModelContent(listener: () => void) {
      content.add(listener)
      return { dispose: () => content.delete(listener) }
    },
    onDidChangeModel(listener: () => void) {
      modelChange.add(listener)
      return { dispose: () => modelChange.delete(listener) }
    },
    typed: () => {
      for (const listener of content) listener()
    },
    listeners: () => content.size + modelChange.size,
  }
  return editor as unknown as monacoNs.editor.IStandaloneCodeEditor & typeof editor
}

describe('monacoHistory: desfazer e refazer do código', () => {
  it('desfaz no modelo DESTE editor (o mesmo que o Ctrl+Z do Monaco faz), sem o comando global', () => {
    const model = {
      undo: mock(() => {}),
      redo: mock(() => {}),
      canUndo: () => true,
      canRedo: () => false,
    }
    const editor = fakeEditor(model)
    const history = createMonacoHistory(editor)
    expect(history.canUndo()).toBe(true)
    expect(history.canRedo()).toBe(false)
    history.undo()
    history.redo()
    expect(model.undo).toHaveBeenCalledTimes(1)
    expect(model.redo).toHaveBeenCalledTimes(1)
    // Pelo comando global o Monaco mandaria o desfazer ao último editor ATIVO da página.
    expect(editor.trigger).not.toHaveBeenCalled()
    history.dispose()
  })

  it('avisa a barra a cada edição e para de ouvir ao sair', () => {
    const editor = fakeEditor({ canUndo: () => true, canRedo: () => true })
    const history = createMonacoHistory(editor)
    const heard = mock(() => {})
    history.subscribe(heard)
    editor.typed()
    expect(heard).toHaveBeenCalledTimes(1)
    history.dispose()
    expect(editor.listeners()).toBe(0)
  })

  it('sem os métodos do modelo (outra versão do Monaco): cai no comando e o botão fica ligado', () => {
    const editor = fakeEditor({})
    const history = createMonacoHistory(editor)
    expect(history.canUndo()).toBe(true)
    history.undo()
    expect(editor.focus).toHaveBeenCalled()
    expect(editor.trigger).toHaveBeenCalledWith('sz-topbar', 'undo', null)
    history.dispose()
  })

  it('sem modelo ou só de leitura: nada a desfazer', () => {
    const vazio = createMonacoHistory(fakeEditor(null))
    expect(vazio.canUndo()).toBe(false)
    const undo = mock(() => {})
    const leitura = createMonacoHistory(
      fakeEditor({ undo, canUndo: () => true }, { readOnly: true }),
    )
    expect(leitura.canUndo()).toBe(false)
    leitura.undo()
    expect(undo).not.toHaveBeenCalled()
  })
})
