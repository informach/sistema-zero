import Editor, { type OnChange, type OnMount } from '@monaco-editor/react'
import type * as monacoNs from 'monaco-editor'
import type { JSX } from 'react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { inferLanguage } from './languages'
import {
  buildMonacoModelPath,
  disposeModelsForPathPrefix,
  getMonacoModelPath,
  isModelInPathPrefix,
  resolveModelPathPrefix,
} from './modelPaths'
import {
  configureMonacoWorkers,
  getMonacoModelRegistry,
  loadLanguageServices,
  monacoThemeName,
} from './workers'

configureMonacoWorkers()

export interface MonacoTabsFile {
  name: string
  value: string
}

export interface MonacoCursorPosition {
  file: string
  line: number
  column: number
}

export interface MonacoHighlight {
  file: string
  startLine: number
  endLine: number
  startColumn?: number
  endColumn?: number
  /**
   * Valor que muda a cada pedido de realce (mesmo para a mesma faixa). Faz o
   * efeito re-rolar/re-realçar ao re-selecionar o mesmo bloco. Não afeta o range.
   */
  nonce?: number
}

export interface MonacoTabsProps {
  files: MonacoTabsFile[]
  activeFile?: string
  onChange: (fileName: string, value: string) => void
  onActiveFileChange?: (fileName: string) => void
  onCursorChange?: (pos: MonacoCursorPosition) => void
  /** Faixa de linhas para destacar e rolar até o topo no arquivo indicado. */
  highlight?: MonacoHighlight | null
  theme?: 'vs-dark' | 'light'
  /** Tamanho da fonte (px). Reativo: muda imediatamente quando o pai atualiza. */
  fontSize?: number
  className?: string
  /** Conteúdo extra renderizado à direita da fila de abas. */
  tabsRightSlot?: JSX.Element
  /**
   * Modo compacto (largura estreita): o botão "Formatar" vira só ícone (o rótulo
   * vai para o `title`/`aria-label`), poupando espaço no cabeçalho quando o editor
   * está numa tira de abas estreita. As abas de arquivo continuam roláveis.
   */
  compact?: boolean
  /**
   * Rótulo do botão "Formatar" (i18n fica no app; o pacote é genérico). Quando
   * omitido, o botão não é exibido. O atalho Shift+Alt+F continua funcionando
   * independentemente deste botão.
   */
  formatLabel?: string
  /**
   * Decide se uma aba pode ser fechada (mostra o "×"). Fechar é só de UI: o
   * arquivo continua existindo; quem o reabre é o componente pai. Os arquivos
   * canônicos (index.html, style.css, script.js) devolvem `false` aqui.
   */
  canCloseFile?: (fileName: string) => boolean
  /** Chamado ao clicar no "×" de uma aba fechável. */
  onCloseFile?: (fileName: string) => void
  /**
   * Prefixo do `path` dos models do Monaco (ex.: id do projeto). O `path` é o
   * identificador do model num registro GLOBAL que sobrevive ao desmonte do
   * componente; sem prefixo, projetos diferentes reusam o mesmo model
   * (`script.js`…) e o editor mostra o código do projeto anterior até trocar de
   * aba. Prefixar por projeto garante models distintos por projeto.
   *
   * Internamente este prefixo é AINDA salgado com um id estável por instância
   * (via `useId`) — ver `resolveModelPathPrefix`. Sem o sal, dois <Studio> no
   * mesmo `projectId` (rota /dual) compartilham os models globais e o desmonte
   * de um descarta os models vivos do outro.
   */
  modelPathPrefix?: string
}

/** Ícone "formatar" (linhas alinhadas) — usado no botão compacto, sem dep externa. */
function FormatGlyph(): JSX.Element {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="14" y2="12" />
      <line x1="4" y1="18" x2="18" y2="18" />
    </svg>
  )
}

function clampLine(line: number, model: monacoNs.editor.ITextModel): number {
  return Math.min(Math.max(1, line), model.getLineCount())
}

function toMonacoRange(
  highlight: MonacoHighlight,
  model: monacoNs.editor.ITextModel,
): monacoNs.IRange {
  const startLine = clampLine(highlight.startLine, model)
  const endLine = Math.max(startLine, clampLine(highlight.endLine, model))
  const startColumn = Math.min(
    Math.max(1, highlight.startColumn ?? 1),
    model.getLineMaxColumn(startLine),
  )
  const maxEndColumn = model.getLineMaxColumn(endLine)
  const minEndColumn = startLine === endLine ? startColumn : 1
  const endColumn = Math.min(
    Math.max(minEndColumn, highlight.endColumn ?? maxEndColumn),
    maxEndColumn,
  )

  return {
    startLineNumber: startLine,
    startColumn,
    endLineNumber: endLine,
    endColumn,
  }
}

function scheduleLanguageServicesLoad(): () => void {
  if (typeof window === 'undefined') return () => {}

  let cancelled = false
  let idleHandle: ReturnType<typeof requestIdleCallback> | null = null

  const run = () => {
    if (cancelled) return
    void loadLanguageServices().catch(() => {})
  }

  const startIdleWork = () => {
    if (cancelled) return
    const requestIdle = window.requestIdleCallback
    if (typeof requestIdle === 'function') {
      idleHandle = requestIdle(run, { timeout: 2500 })
      return
    }
    run()
  }

  const frameHandle = window.requestAnimationFrame(startIdleWork)

  return () => {
    cancelled = true
    window.cancelAnimationFrame(frameHandle)
    if (idleHandle !== null) {
      window.cancelIdleCallback?.(idleHandle)
    }
  }
}

export function MonacoTabs({
  files,
  activeFile,
  onChange,
  onActiveFileChange,
  onCursorChange,
  highlight,
  theme = 'vs-dark',
  fontSize = 13,
  className,
  tabsRightSlot,
  formatLabel,
  canCloseFile,
  onCloseFile,
  modelPathPrefix,
  compact = false,
}: MonacoTabsProps): JSX.Element {
  // Id ESTÁVEL por instância: gerado uma vez por montagem do componente. Salga o
  // prefixo dos models para que dois <Studio> no mesmo `projectId` (rota /dual)
  // não compartilhem nem descartem os models um do outro no registro global.
  const instanceId = useId()
  const saltedPrefix = useMemo(
    () => resolveModelPathPrefix(modelPathPrefix, instanceId),
    [modelPathPrefix, instanceId],
  )
  const [internalActive, setInternalActive] = useState<string>(activeFile ?? files[0]?.name ?? '')
  const requested = activeFile ?? internalActive
  const file = files.find((f) => f.name === requested) ?? files[0]
  // Deriva o nome ativo do arquivo RESOLVIDO (não do pedido): se a aba ativa some
  // de `files` (fechar arquivo no modo não-controlado + fechável), `requested`
  // ainda aponta para o arquivo removido enquanto o editor cai em `files[0]`. Sem
  // derivar daqui, a fila de abas não realça nenhuma aba e o realce/cursor
  // comparam contra um nome que não existe mais. Manter `current` casado com o
  // model exibido garante que a aba ativa, o realce e o editor concordem.
  const current = file?.name ?? requested

  // Reconcilia o estado não-controlado quando a aba ativa deixa de existir em
  // `files`. Sem isso, `internalActive` fica preso no arquivo removido: uma
  // próxima mudança de `files` que reintroduza esse nome o reativaria por
  // engano, e o estado divergiria do que o editor exibe. Só roda no modo
  // não-controlado (controlado é responsabilidade do pai).
  useEffect(() => {
    if (activeFile !== undefined) return
    if (files.some((f) => f.name === internalActive)) return
    const fallback = files[0]?.name ?? ''
    if (fallback !== internalActive) setInternalActive(fallback)
  }, [activeFile, files, internalActive])
  const editorRef = useRef<monacoNs.editor.IStandaloneCodeEditor | null>(null)
  const decorationsRef = useRef<monacoNs.editor.IEditorDecorationsCollection | null>(null)
  const activeHighlightRef = useRef<MonacoHighlight | null>(null)
  const onCursorChangeRef = useRef(onCursorChange)
  const [mountedEditor, setMountedEditor] = useState<monacoNs.editor.IStandaloneCodeEditor | null>(
    null,
  )

  useEffect(() => scheduleLanguageServicesLoad(), [])

  useEffect(() => {
    const prefix = saltedPrefix
    return () => {
      disposeModelsForPathPrefix(prefix, getMonacoModelRegistry())
    }
  }, [saltedPrefix])

  // Reconcilia o registro GLOBAL de models a cada mudança do conjunto de
  // arquivos: fechar uma aba tira o arquivo de `files`, mas o
  // `@monaco-editor/react` NÃO descarta o model antigo — e a varredura no
  // desmonte só roda no fim da sessão. Sem isto, cada aba fechada deixa um model
  // vivo no registro até o componente desmontar (pior no ProCodeMode, com a
  // árvore de arquivos inteira). Descartamos aqui os models sob `saltedPrefix`
  // que não estão mais abertos, PRESERVANDO o model ativo do editor (descartá-lo
  // deixaria o editor sem documento até a próxima troca de aba). A varredura do
  // desmonte permanece como rede de segurança.
  useEffect(() => {
    if (!mountedEditor) return
    const openPaths = new Set(files.map((f) => buildMonacoModelPath(saltedPrefix, f.name)))
    const activeModelPath = (() => {
      const model = mountedEditor.getModel()
      return model ? getMonacoModelPath(model) : null
    })()
    for (const model of getMonacoModelRegistry().getModels()) {
      if (!isModelInPathPrefix(model, saltedPrefix)) continue
      const path = getMonacoModelPath(model)
      if (openPaths.has(path)) continue
      // Nunca descarta o model que o editor está exibindo agora.
      if (path === activeModelPath) continue
      model.dispose()
    }
  }, [files, saltedPrefix, mountedEditor])

  useEffect(() => {
    onCursorChangeRef.current = onCursorChange
  }, [onCursorChange])

  const clearHighlightDecorations = useCallback(() => {
    decorationsRef.current?.clear()
  }, [])

  const setActive = useCallback(
    (name: string) => {
      if (activeFile === undefined) setInternalActive(name)
      onActiveFileChange?.(name)
    },
    [activeFile, onActiveFileChange],
  )

  const handleChange: OnChange = (value) => {
    if (file) onChange(file.name, value ?? '')
  }

  const handleFormat = useCallback(() => {
    editorRef.current?.getAction('editor.action.formatDocument')?.run()
  }, [])

  const handleMount: OnMount = useCallback((editor) => {
    editorRef.current = editor
    setMountedEditor(editor)
  }, [])

  const applyHighlightToCurrentModel = useCallback(
    (target: MonacoHighlight): boolean => {
      const editor = editorRef.current
      const model = editor?.getModel()
      if (!editor || !model) return false

      const expectedPath = buildMonacoModelPath(saltedPrefix, target.file)
      if (getMonacoModelPath(model) !== expectedPath) return false

      const range = toMonacoRange(target, model)
      // Só REVELA e DECORA (realce de linha + gutter). NÃO usamos
      // `editor.setSelection`: selecionar o trecho inteiro roubava a seleção/cursor
      // do aluno a cada realce de bloco — no modo Ponte isso deixava um trecho
      // preso selecionado e impedia a edição. A decoration abaixo já mostra a faixa.
      editor.revealRangeInCenterIfOutsideViewport(range)

      const decorations = [
        {
          range,
          options: {
            isWholeLine: true,
            className: 'sz-highlight-line',
            linesDecorationsClassName: 'sz-highlight-gutter',
          },
        },
      ]
      if (decorationsRef.current) {
        decorationsRef.current.set(decorations)
      } else {
        decorationsRef.current = editor.createDecorationsCollection(decorations)
      }
      // O realce persiste até `highlight` virar `null` (efeito abaixo limpa via
      // `clearHighlightDecorations`). Não usamos timer: o aluno espera que o
      // realce viva enquanto o bloco estiver selecionado no canvas.
      return true
    },
    [saltedPrefix],
  )

  useEffect(() => {
    if (!mountedEditor) return
    const prefix = saltedPrefix
    const disposable = mountedEditor.onDidChangeCursorPosition((e) => {
      const emitCursorChange = onCursorChangeRef.current
      if (!emitCursorChange) return
      // Deriva o arquivo do model ATUAL do editor — não de um ref de nome do
      // arquivo atualizado num efeito do PAI que roda DEPOIS da troca de model do
      // filho: um evento de cursor durante o `restoreViewState` ao revisitar uma
      // aba carregaria o nome ANTERIOR. O guard por `source` não serve aqui
      // (`restoreViewState` emite com `source === 'api'`, não `'model'`).
      const model = mountedEditor.getModel()
      if (!model) return
      const modelPath = getMonacoModelPath(model)
      const expectedStart = `${prefix}/`
      if (!modelPath.startsWith(expectedStart)) return
      const fileName = modelPath.slice(expectedStart.length)
      if (!fileName) return
      emitCursorChange({
        file: fileName,
        line: e.position.lineNumber,
        column: e.position.column,
      })
    })
    return () => disposable.dispose()
  }, [mountedEditor, saltedPrefix])

  useEffect(() => {
    if (!mountedEditor) return
    const applyPendingHighlight = () => {
      const pending = activeHighlightRef.current
      if (pending) applyHighlightToCurrentModel(pending)
    }
    const disposable = mountedEditor.onDidChangeModel(applyPendingHighlight)
    applyPendingHighlight()
    return () => disposable.dispose()
  }, [mountedEditor, applyHighlightToCurrentModel])

  useEffect(
    () => () => {
      clearHighlightDecorations()
    },
    [clearHighlightDecorations],
  )

  // Reage a `highlight`: troca tab se necessário, rola para a linha e
  // pinta uma decoration na faixa indicada.
  useEffect(() => {
    activeHighlightRef.current = highlight ?? null
    if (!highlight) {
      clearHighlightDecorations()
      return
    }
    if (highlight.file !== current) {
      setActive(highlight.file)
      return
    }
    applyHighlightToCurrentModel(highlight)
  }, [highlight, current, setActive, applyHighlightToCurrentModel, clearHighlightDecorations])

  if (!file) {
    return <div className={className}>Nenhum arquivo.</div>
  }

  return (
    <div className={['flex h-full flex-col', className].filter(Boolean).join(' ')}>
      <div className="flex items-stretch border-b border-sz-border bg-sz-panel">
        <div className="flex flex-1 overflow-x-auto">
          {files.map((f) => {
            const isActive = f.name === current
            const closable = canCloseFile?.(f.name) ?? false
            return (
              <div
                key={f.name}
                className={[
                  'group flex items-center transition-colors',
                  isActive
                    ? 'border-b-2 border-sz-accent text-sz-fg'
                    : 'border-b-2 border-transparent text-sz-fg-soft hover:text-sz-fg',
                ].join(' ')}
              >
                <button
                  type="button"
                  onClick={() => setActive(f.name)}
                  className={['py-2 pl-3 text-xs font-medium', closable ? 'pr-1' : 'pr-3'].join(
                    ' ',
                  )}
                >
                  {f.name}
                </button>
                {closable && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onCloseFile?.(f.name)
                    }}
                    className="mr-1 rounded px-1 text-sz-fg-soft opacity-60 hover:bg-sz-border hover:opacity-100"
                    title={`Fechar ${f.name}`}
                    aria-label={`Fechar ${f.name}`}
                  >
                    ×
                  </button>
                )}
              </div>
            )
          })}
        </div>
        {formatLabel && (
          <div className="flex items-center border-l border-sz-border px-2">
            <button
              type="button"
              onClick={handleFormat}
              title={`${formatLabel} (Shift+Alt+F)`}
              aria-label={formatLabel}
              className="inline-flex items-center rounded px-2.5 py-1.5 text-xs font-medium leading-none text-sz-fg hover:bg-sz-bg"
            >
              {compact ? <FormatGlyph /> : formatLabel}
            </button>
          </div>
        )}
        {tabsRightSlot && (
          <div className="flex items-center border-l border-sz-border px-2">{tabsRightSlot}</div>
        )}
      </div>
      <div className="flex-1">
        <Editor
          height="100%"
          theme={monacoThemeName(theme)}
          path={buildMonacoModelPath(saltedPrefix, file.name)}
          defaultLanguage={inferLanguage(file.name)}
          value={file.value}
          onChange={handleChange}
          onMount={handleMount}
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            fontSize,
            fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, Menlo, monospace",
            tabSize: 2,
            automaticLayout: true,
            // Formatação (Shift+Alt+F continua disponível); evitamos formatOnType
            // por ser intrusivo enquanto o aluno digita.
            formatOnPaste: true,
            // Autocomplete responsivo.
            quickSuggestions: true,
            suggestOnTriggerCharacters: true,
            tabCompletion: 'on',
            parameterHints: { enabled: true },
            // UX de edição.
            bracketPairColorization: { enabled: true },
            guides: { bracketPairs: true, indentation: true },
            autoIndent: 'full',
            autoClosingBrackets: 'languageDefined',
          }}
        />
      </div>
    </div>
  )
}
