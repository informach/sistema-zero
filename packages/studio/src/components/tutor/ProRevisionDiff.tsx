import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import { useLayoutEffect, useRef } from 'react'
import { configureMonacoWorkers } from '../../monaco/workers'

configureMonacoWorkers()

/** Owns only the two review models. Detach before disposal, including StrictMode cleanup. */
export default function ProRevisionDiff({ before, after }: { before: string; after: string }) {
  const container = useRef<HTMLDivElement>(null)
  const models = useRef<monaco.editor.IDiffEditorModel | null>(null)
  useLayoutEffect(() => {
    if (!container.current) return
    const namespace = `studio-review://${crypto.randomUUID()}`
    const pair = {
      original: monaco.editor.createModel('', 'plaintext', monaco.Uri.parse(`${namespace}/before`)),
      modified: monaco.editor.createModel('', 'plaintext', monaco.Uri.parse(`${namespace}/after`)),
    }
    const editor = monaco.editor.createDiffEditor(container.current, {
      readOnly: true,
      originalEditable: false,
      renderSideBySide: false,
      ignoreTrimWhitespace: false,
      maxComputationTime: 200,
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 12,
      scrollBeyondLastLine: false,
    })
    models.current = pair
    editor.setModel(pair)
    return () => {
      models.current = null
      editor.setModel(null)
      editor.dispose()
      pair.original.dispose()
      pair.modified.dispose()
    }
  }, [])
  useLayoutEffect(() => {
    models.current?.original.setValue(before)
    models.current?.modified.setValue(after)
  }, [before, after])
  return (
    <section
      className="h-72 overflow-hidden rounded-lg border border-sz-border"
      aria-label="Diferenças da proposta"
    >
      <div ref={container} className="h-full w-full" />
    </section>
  )
}
