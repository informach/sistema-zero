import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import { useLayoutEffect, useRef, useState } from 'react'
import { Button, Modal } from '#ui'
import { inferLanguage } from '../../monaco/languages'
import { proLanguage } from '../../monaco/pro/languages'
import { configureMonacoWorkers } from '../../monaco/workers'
import { useSettingsStore } from '../../state/settingsStore'

configureMonacoWorkers()

/** Owns only the two review models. Detach before disposal, including StrictMode cleanup. */
interface DiffProps {
  before: string
  after: string
  path?: string
}
function DiffSurface({
  before,
  after,
  path = '',
  sideBySide,
  height,
}: DiffProps & { sideBySide: boolean; height: number }) {
  const container = useRef<HTMLDivElement>(null)
  const models = useRef<monaco.editor.IDiffEditorModel | null>(null)
  const instance = useRef<monaco.editor.IStandaloneDiffEditor | null>(null)
  const [languageError, setLanguageError] = useState(false)
  const fontSize = useSettingsStore((state) => (state.codeFontSizeChosen ? state.codeFontSize : 15))
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
      fontSize: 15,
      renderValidationDecorations: 'off',
      scrollBeyondLastLine: false,
    })
    models.current = pair
    instance.current = editor
    // Own the view model too: Monaco defers its implicit disposal after setModel(null).
    // Cancel its worker calculation before disposing the text models it reads.
    const viewModel = editor.createViewModel(pair)
    editor.setModel(viewModel)
    return () => {
      models.current = null
      instance.current = null
      editor.setModel(null)
      viewModel.dispose()
      editor.dispose()
      pair.original.dispose()
      pair.modified.dispose()
    }
  }, [])
  useLayoutEffect(() => {
    models.current?.original.setValue(before)
    models.current?.modified.setValue(after)
  }, [before, after])
  useLayoutEffect(() => {
    const language = proLanguage(inferLanguage(path))
    const pair = models.current
    if (!pair) return
    let active = true
    setLanguageError(false)
    const selectLanguage = () => {
      if (!active || models.current !== pair) return
      monaco.editor.setModelLanguage(pair.original, language)
      monaco.editor.setModelLanguage(pair.modified, language)
    }
    // Review may open before the source editor. Own this registration without
    // adding Python's tokenizer to JavaScript sessions or reviving disposed models.
    if (language === 'python')
      void import('monaco-editor/esm/vs/basic-languages/python/python.contribution.js').then(
        selectLanguage,
        () => {
          if (active && models.current === pair) setLanguageError(true)
        },
      )
    else selectLanguage()
    return () => {
      active = false
    }
  }, [path])
  useLayoutEffect(() => {
    instance.current?.updateOptions({ renderSideBySide: sideBySide, fontSize })
  }, [sideBySide, fontSize])
  return (
    <>
      {languageError && (
        <p role="alert">
          Não foi possível carregar as cores do código. As alterações continuam visíveis.
        </p>
      )}
      <section
        className="max-h-[65vh] overflow-hidden rounded-lg border border-sz-border"
        style={{ height }}
        aria-label="Diferenças da proposta"
      >
        <div ref={container} className="h-full w-full" />
      </section>
    </>
  )
}

export default function ProRevisionDiff(props: DiffProps) {
  const [expanded, setExpanded] = useState(false)
  const [sideBySide, setSideBySide] = useState(false)
  const [height, setHeight] = useState(360)
  const controls = (
    <div className="mb-2 flex flex-wrap items-center gap-3 text-xs">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={sideBySide}
          onChange={(event) => setSideBySide(event.target.checked)}
        />
        Lado a lado
      </label>
      <label className="flex items-center gap-2">
        Altura da comparação
        <input
          type="range"
          min={240}
          max={680}
          step={40}
          value={height}
          onChange={(event) => setHeight(Number(event.target.value))}
        />
      </label>
    </div>
  )
  return (
    <>
      {!expanded && (
        <>
          {controls}
          <DiffSurface {...props} sideBySide={sideBySide} height={height} />
          <Button size="sm" className="mt-2" onClick={() => setExpanded(true)}>
            Ampliar comparação
          </Button>
        </>
      )}
      <Modal
        open={expanded}
        onClose={() => setExpanded(false)}
        title={`Ver mudanças${props.path ? ` · ${props.path}` : ''}`}
        className="max-w-[min(1400px,96vw)]"
        footer={<Button onClick={() => setExpanded(false)}>Voltar à revisão</Button>}
      >
        {expanded && (
          <>
            {controls}
            <DiffSurface {...props} sideBySide={sideBySide} height={height} />
          </>
        )}
      </Modal>
    </>
  )
}
