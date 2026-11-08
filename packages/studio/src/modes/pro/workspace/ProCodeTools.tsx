import type * as Monaco from 'monaco-editor'
import { type ReactNode, type RefObject, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn, IconX, Modal } from '#ui'
import { proFileBaseName } from '../../../components/code/proFileKinds'
import { type ProExample, proCodeExamples } from '../../../core/proExamples'
import type { ProjectTree } from '../../../core/proProject'
import { getMonacoModelPath } from '../../../monaco/modelPaths'
import type { ProSymbol } from '../../../monaco/pro/languageService'
import { useProjectStore } from '../../../state/projectStore'
import type { ProWorkspaceIntent } from '../../../state/proWorkspaceOperations'
import { useUIStore } from '../../../state/uiStore'
import { useT } from '../../../studio/i18n'
import { findProCommands, type ProCommand, runProCommand } from './commands'
import type { ProWorkspaceLanguage } from './language'
import { proSourcePosition } from './search'
import { useProCommands } from './useProCommands'

const button =
  'min-h-9 rounded px-2 text-xs hover:bg-sz-panel focus-visible:outline focus-visible:outline-sz-accent disabled:opacity-40'

/** O que a faixa do editor pede daqui (as janelas moram aqui; a faixa só abre). */
export interface ProEditorTools {
  openSymbols(): void
  openCommands(): void
  findReferences(): void
  rename(): void
}

/**
 * A LÓGICA e as JANELAS das ferramentas de código do Pro (redesenho de 11/2026): o mapa do
 * arquivo, "Onde isto é usado", "Trocar nome em todo lugar", a paleta "Todas as ações" e os
 * atalhos do Monaco (`useProCommands`). Não desenha mais a faixa de botões: a faixa única sobre
 * o código (`ProEditorStrip`) chama o `ProEditorTools` publicado por `onToolsReady`.
 */
export function ProCodeTools({
  path,
  tree,
  language,
  editor,
  readyEditor = null,
  navigate,
  back,
  canGoBack,
  prepare,
  busy,
  recover,
  search,
  searchProject = search,
  format,
  help,
  examples = proCodeExamples,
  onToolsReady,
  mapContainer,
}: {
  path: string
  tree: ProjectTree
  language: ProWorkspaceLanguage | null
  editor: RefObject<Monaco.editor.IStandaloneCodeEditor | null>
  readyEditor?: Monaco.editor.IStandaloneCodeEditor | null
  navigate: (path: string, line: number, column?: number) => void
  back: () => void
  canGoBack: boolean
  prepare: (intent: ProWorkspaceIntent) => void
  busy: boolean
  recover: () => void
  search: () => void
  searchProject?: () => void
  format: () => void
  help?: (intent: 'explain' | 'investigate' | 'change') => void
  examples?: (path: string) => ProExample[]
  /** As ações que a faixa do editor chama (`null` ao sair). */
  onToolsReady?: (tools: ProEditorTools | null) => void
  /** A coluna ao lado do editor onde o mapa do arquivo aparece (sem ela, aparece aqui). */
  mapContainer?: HTMLElement | null
}) {
  const t = useT()
  const [toolsOpen, setToolsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const author = useProjectStore((state) => state.editingAccess !== 'observer')
  const showAssets = useUIStore((state) => state.setShowAssets)
  const [open, setOpen] = useState(false)
  const [symbolResult, setSymbols] = useState<{
    session: ProWorkspaceLanguage
    content: string
    path: string
    items: ProSymbol[]
    error: string | null
  } | null>(null)
  const [referenceResult, setReferences] = useState<{
    session: ProWorkspaceLanguage
    tree: ProjectTree
    items: Array<{ path: string; line: number; column: number }>
  } | null>(null)
  const content = tree[path]?.kind === 'file' ? tree[path].content : ''
  const currentSymbols =
    symbolResult?.content === content &&
    symbolResult.path === path &&
    symbolResult.session === language
      ? symbolResult
      : null
  const symbols = currentSymbols?.items ?? []
  const references =
    referenceResult?.tree === tree && referenceResult.session === language
      ? referenceResult.items
      : []
  const referenceRequest = useRef(0)
  // Requests cannot outlive this panel. The scope below also rejects A → B → A.
  useEffect(
    () => () => {
      referenceRequest.current++
    },
    [],
  )
  const [rename, setRename] = useState<{
    path: string
    content: string
    offset: number
    name: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const scope = useMemo(() => ({ path, tree, language }), [path, tree, language])
  const current = useRef(scope)
  current.current = scope
  const symbolSource = useMemo(
    () => (open && /\.(?:[cm]?[jt]sx?|pyi?)$/.test(path) ? { path, content } : null),
    [open, path, content],
  )
  // A new document is pending until its response arrives. Derive that state:
  // dispatching resets from every typing effect accumulates nested React updates.
  const symbolsPending = Boolean(symbolSource && language && !currentSymbols)
  const visibleError = error ?? (open ? currentSymbols?.error : null)
  useEffect(() => {
    if (!symbolSource || !language) return
    const { path, content } = symbolSource
    let active = true
    void language
      .request('symbols', path)
      .then((items) => {
        const node = current.current.tree[path]
        const model = editor.current?.getModel()
        const matches =
          model &&
          (model.getValue() === content ||
            (language.documentOffset?.(content, model.getValue(), { lineNumber: 1, column: 1 }) ??
              null) !== null)
        if (
          active &&
          current.current.path === path &&
          node?.kind === 'file' &&
          node.content === content &&
          matches
        )
          setSymbols({ session: language, content, path, items, error: null })
      })
      .catch((cause: unknown) => {
        if (active)
          setSymbols({
            session: language,
            content,
            path,
            items: [],
            error: cause instanceof Error ? cause.message : 'Não foi possível ler o mapa.',
          })
      })
    return () => {
      active = false
    }
  }, [symbolSource, language, editor])
  const capture = () => {
    const model = editor.current?.getModel(),
      cursor = editor.current?.getPosition()
    const modelPath = model ? getMonacoModelPath(model) : ''
    const offset =
      model && cursor
        ? language?.documentOffset
          ? language.documentOffset(content, model.getValue(), cursor)
          : model.getValue() === content
            ? model.getOffsetAt(cursor)
            : null
        : null
    if (
      !model ||
      !cursor ||
      modelPath.slice(modelPath.indexOf('/') + 1) !== path ||
      offset === null
    ) {
      setError('Clique no nome dentro do código antes de usar esta ação.')
      return null
    }
    return {
      path,
      content,
      offset,
      name: model.getWordAtPosition(cursor)?.word ?? '',
    }
  }
  const findReferences = async () => {
    const request = ++referenceRequest.current
    const selected = capture()
    if (!selected || !language) return
    const isCurrent = () => referenceRequest.current === request && current.current === scope
    setError(null)
    try {
      const items = await language.request('references', path, selected.offset)
      if (!isCurrent()) return
      const results = items
        .flatMap((item) => {
          const node = tree[item.path]
          return node?.kind === 'file'
            ? [{ path: item.path, ...proSourcePosition(node.content, item.span.start) }]
            : []
        })
        .slice(0, 100)
      setReferences({ session: language, tree, items: results })
      if (!results.length) setError('Nenhuma referência encontrada para esse nome no projeto.')
    } catch (cause) {
      if (isCurrent())
        setError(cause instanceof Error ? cause.message : 'Não foi possível buscar as referências.')
    }
  }
  const commands: ProCommand[] = [
    ...(help
      ? (['explain', 'investigate', 'change'] as const).map(
          (intent): ProCommand => ({
            id: intent,
            label: t(`pro.zappy.${intent}`),
            enabled: Boolean(path) && (intent !== 'change' || author),
            ...(intent === 'change' ? { shortcut: 'Ctrl/Cmd+Alt+K' } : {}),
            run: () => help(intent),
          }),
        )
      : []),
    {
      id: 'commands',
      label: t('pro.commands'),
      shortcut: 'Ctrl/Cmd+Shift+P',
      keybinding: 'commands',
      enabled: true,
      run: () => {
        setQuery('')
        setToolsOpen(true)
      },
    },
    {
      id: 'back',
      label: t('pro.back'),
      enabled: canGoBack,
      run: back,
    },
    {
      id: 'search',
      label: t('pro.quickOpen'),
      shortcut: 'Ctrl/Cmd+P',
      keybinding: 'quickOpen',
      enabled: true,
      run: search,
    },
    {
      id: 'searchProject',
      label: t('pro.searchContent'),
      shortcut: 'Ctrl/Cmd+Shift+F',
      keybinding: 'searchProject',
      enabled: true,
      run: searchProject,
    },
    {
      id: 'symbols',
      label: t('pro.symbols'),
      shortcut: 'Ctrl/Cmd+Shift+O',
      keybinding: 'symbols',
      enabled: Boolean(path),
      run: () => setOpen(true),
    },
    {
      id: 'format',
      label: t('pro.organizeCode'),
      shortcut: 'Shift+Alt+F',
      enabled: Boolean(path) && author && !busy,
      run: format,
    },
    {
      id: 'materials',
      label: t('pro.materialsCommand'),
      enabled: true,
      run: () => showAssets(true),
    },
    {
      id: 'references',
      label: t('pro.references'),
      shortcut: 'Shift+F12',
      keybinding: 'references',
      enabled: Boolean(path) && !busy,
      run: () => void findReferences(),
    },
    {
      id: 'rename',
      label: t('pro.renameSymbol'),
      shortcut: 'F2',
      keybinding: 'rename',
      enabled: Boolean(path) && author && !busy,
      run: () => {
        setError(null)
        setRename(capture())
      },
    },
    {
      id: 'recover',
      label: t('pro.recoverCommand'),
      enabled: author && !busy,
      run: recover,
    },
    ...examples(path).map(
      (example): ProCommand => ({
        id: `example:${example.id}`,
        label: t('pro.insertExample', { label: example.label }),
        enabled: author && !busy,
        run: () =>
          prepare({
            kind: 'example',
            path,
            source: content,
            text: example.code,
            name: example.name,
            label: example.label,
          }),
      }),
    ),
  ]
  useProCommands(readyEditor, commands)
  // A paleta não lista a si mesma.
  const paletteCommands = commands.filter((command) => command.id !== 'commands')
  // As ações para a faixa do editor: um objeto estável que chama a versão mais nova de cada
  // função (via ref), publicado uma vez e retirado na saída.
  const latestActions = useRef({ findReferences, capture })
  latestActions.current = { findReferences, capture }
  const tools = useMemo<ProEditorTools>(
    () => ({
      openSymbols: () => setOpen(true),
      openCommands: () => {
        setQuery('')
        setToolsOpen(true)
      },
      findReferences: () => void latestActions.current.findReferences(),
      rename: () => {
        setError(null)
        setRename(latestActions.current.capture())
      },
    }),
    [],
  )
  useEffect(() => {
    onToolsReady?.(tools)
    return () => onToolsReady?.(null)
  }, [tools, onToolsReady])
  const placeMap = (node: ReactNode) => (mapContainer ? createPortal(node, mapContainer) : node)
  const closeSymbols = () => {
    setOpen(false)
    setSymbols((previous) => (previous?.error ? { ...previous, error: null } : previous))
  }
  return (
    <>
      <Modal
        open={toolsOpen}
        onClose={() => setToolsOpen(false)}
        title={t('pro.commands')}
        footer={
          <button type="button" className="sz-pro-btn" onClick={() => setToolsOpen(false)}>
            {t('pro.backToCode')}
          </button>
        }
      >
        <label className="block">
          {t('pro.palette.question')}
          <input
            type="search"
            value={query}
            maxLength={100}
            onChange={(event) => setQuery(event.target.value)}
            className="my-2 block min-h-10 w-full rounded-xl border-2 border-sz-border bg-sz-bg px-3"
          />
        </label>
        <ul className="space-y-1">
          {findProCommands(paletteCommands, query).map((command) => (
            <li key={command.id}>
              <button
                type="button"
                disabled={!command.enabled}
                className={cn(button, 'flex w-full items-center justify-between text-left')}
                onClick={() => {
                  setToolsOpen(false)
                  runProCommand(commands, command.id)
                }}
              >
                <span>{command.label}</span>
                {command.shortcut && (
                  <kbd className="ml-3 font-sans text-sz-fg-mute">{command.shortcut}</kbd>
                )}
              </button>
            </li>
          ))}
        </ul>
        {!findProCommands(paletteCommands, query).length && (
          <p role="status">{t('pro.palette.none')}</p>
        )}
        <p className="mt-3 text-xs text-sz-fg-soft">{t('pro.palette.hint')}</p>
      </Modal>
      {open &&
        placeMap(
          // O mapa do arquivo é uma coluna ao lado do código, NÃO uma janela: dá para continuar
          // escrevendo com ele aberto (o mapa acompanha as mudanças), e ele não cobre nada.
          <section
            aria-label={t('pro.symbols')}
            className="sz-pro-map"
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.stopPropagation()
                closeSymbols()
                editor.current?.focus()
              }
            }}
          >
            <header className="flex items-center gap-2 border-b border-sz-border-soft px-3 py-2">
              <h3 className="m-0 min-w-0 flex-1 text-sm font-black">
                {t('pro.symbols')}
                <span className="ml-2 font-normal text-sz-fg-soft">{proFileBaseName(path)}</span>
              </h3>
              <button
                type="button"
                className="sz-pro-btn sz-pro-btn--sm sz-pro-btn--icon"
                aria-label={t('pro.symbols.close')}
                onClick={() => {
                  closeSymbols()
                  editor.current?.focus()
                }}
              >
                <IconX />
              </button>
            </header>
            <div className="min-h-0 overflow-auto p-2">
              {symbolsPending && (
                <p role="status" className="m-0 p-2 text-xs text-sz-fg-mute">
                  {t('pro.symbols.pending')}
                </p>
              )}
              {!symbolsPending && !symbols.length && !visibleError && (
                <p className="m-0 p-2 text-sm text-sz-fg-soft">{t('pro.symbols.empty')}</p>
              )}
              {visibleError && (
                <p role="status" className="m-0 p-2 text-xs text-sz-error">
                  {visibleError}
                </p>
              )}
              <ul className="m-0 list-none space-y-0.5 p-0">
                {symbols.map((symbol) => {
                  const target = proSourcePosition(content, symbol.start)
                  return (
                    <li key={`${symbol.start}:${symbol.name}`}>
                      <button
                        type="button"
                        className={cn(button, 'flex w-full items-center justify-between text-left')}
                        style={{ paddingLeft: `${8 + symbol.depth * 12}px` }}
                        onClick={() => navigate(path, target.line, target.column)}
                      >
                        <span className="truncate font-mono">{symbol.name}</span>
                        <span className="ml-3 flex-none text-sz-fg-mute">
                          {t('pro.symbols.line', { line: target.line })}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </section>,
        )}
      {references.length > 0 && (
        <section
          className="max-h-40 shrink-0 overflow-auto border-b border-sz-border-soft px-2 pb-2"
          aria-label="Referências encontradas"
        >
          <button
            type="button"
            className={button}
            onClick={() => {
              referenceRequest.current++
              setReferences(null)
            }}
          >
            {t('pro.references.close')}
          </button>
          {references.map((item) => (
            <button
              key={`${item.path}:${item.line}:${item.column}`}
              type="button"
              className={`${button} block w-full text-left`}
              onClick={() => navigate(item.path, item.line, item.column)}
            >
              {item.path}:{item.line}
            </button>
          ))}
        </section>
      )}
      <Modal open={Boolean(rename)} onClose={() => setRename(null)} title={t('pro.renameSymbol')}>
        {rename && (
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault()
              const node = tree[rename.path]
              if (node?.kind !== 'file' || node.content !== rename.content) {
                setError('O arquivo mudou. Selecione o nome novamente.')
                setRename(null)
                return
              }
              prepare({
                kind: 'symbol',
                path: rename.path,
                offset: rename.offset,
                name: rename.name,
              })
              setRename(null)
            }}
          >
            <p className="m-0 text-sm text-sz-fg-soft">
              {t('pro.rename.current')}:{' '}
              <code className="rounded bg-sz-panel-soft px-1.5 py-0.5 text-sz-fg">
                {editor.current
                  ?.getModel()
                  ?.getWordAtPosition(editor.current.getPosition() ?? { lineNumber: 1, column: 1 })
                  ?.word ?? rename.name}
              </code>
            </p>
            <label className="text-sm">
              {t('pro.rename.new')}
              <input
                aria-label="Novo nome do símbolo"
                value={rename.name}
                onChange={(event) => setRename({ ...rename, name: event.target.value })}
                className="mt-1 block min-h-10 w-full rounded-xl border-2 border-sz-border bg-sz-bg px-3 font-mono"
              />
            </label>
            <div className="flex flex-wrap justify-end gap-2">
              <button className="sz-pro-btn" type="button" onClick={() => setRename(null)}>
                {t('pro.cancel')}
              </button>
              <button className="sz-pro-btn sz-pro-btn--primary" type="submit">
                {t('pro.rename.check')}
              </button>
            </div>
          </form>
        )}
      </Modal>
      {!open && visibleError && (
        <p role="status" className="shrink-0 px-3 py-2 text-xs text-sz-error">
          {visibleError}{' '}
          <button type="button" className="underline" onClick={() => setError(null)}>
            Fechar
          </button>
        </p>
      )}
    </>
  )
}
