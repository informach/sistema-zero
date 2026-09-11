import type * as monacoNs from 'monaco-editor'
import { useCallback, useEffect, useRef } from 'react'
import { createMonacoHistory } from '../../monaco/monacoHistory'
import { useEditorHistory } from '../../state/studioStores'

/**
 * Liga o editor de CÓDIGO aos botões de desfazer da barra: devolve o `onEditorReady` do
 * `MonacoTabs`. Com o editor montado, a pilha dele entra no registro da instância como o alvo
 * `code`, e focar o texto do editor faz dele o alvo da Ponte (o último editor tocado).
 */
export function useCodeHistory(): (editor: monacoNs.editor.IStandaloneCodeEditor | null) => void {
  const history = useEditorHistory()
  const cleanupRef = useRef<(() => void) | null>(null)

  const onEditorReady = useCallback(
    (editor: monacoNs.editor.IStandaloneCodeEditor | null) => {
      cleanupRef.current?.()
      cleanupRef.current = null
      if (!editor || !history) return
      const adapter = createMonacoHistory(editor)
      const unregister = history.register('code', adapter)
      const focus = editor.onDidFocusEditorText(() => history.markActive('code'))
      cleanupRef.current = () => {
        focus.dispose()
        unregister()
        adapter.dispose()
      }
    },
    [history],
  )

  useEffect(
    () => () => {
      cleanupRef.current?.()
      cleanupRef.current = null
    },
    [],
  )

  return onEditorReady
}
