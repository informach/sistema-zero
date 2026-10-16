import type * as Monaco from 'monaco-editor'
import { type RefObject, useEffect, useRef, useState } from 'react'
import { Button, Modal } from '#ui'
import { proCodeExamples } from '../../../core/proExamples'
import type { ProjectTree } from '../../../core/proProject'
import { getMonacoModelPath } from '../../../monaco/modelPaths'
import type { ProSymbol } from '../../../monaco/pro/languageService'
import type { ProLanguageSession } from '../../../monaco/pro/session'
import { useProjectStore } from '../../../state/projectStore'
import type { ProWorkspaceIntent } from '../../../state/proWorkspaceOperations'
import { useUIStore } from '../../../state/uiStore'
import { findProCommands, type ProCommand } from './commands'
import { proSourcePosition } from './search'

const button =
  'min-h-9 rounded px-2 text-xs hover:bg-sz-panel focus-visible:outline focus-visible:outline-sz-accent disabled:opacity-40'
export function ProCodeTools({
  path,
  tree,
  language,
  editor,
  navigate,
  back,
  canGoBack,
  prepare,
  busy,
  recover,
  search,
  format,
  help,
}: {
  path: string
  tree: ProjectTree
  language: RefObject<ProLanguageSession | null>
  editor: RefObject<Monaco.editor.IStandaloneCodeEditor | null>
  navigate: (path: string, line: number, column?: number) => void
  back: () => void
  canGoBack: boolean
  prepare: (intent: ProWorkspaceIntent) => void
  busy: boolean
  recover: () => void
  search: () => void
  format: () => void
  help?: (intent: 'explain' | 'investigate' | 'change') => void
}) {
  const [toolsOpen, setToolsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const author = useProjectStore((state) => state.editingAccess !== 'observer')
  const showAssets = useUIStore((state) => state.setShowAssets)
  const [open, setOpen] = useState(false)
  const [symbolResult, setSymbols] = useState<{
    tree: ProjectTree
    path: string
    items: ProSymbol[]
  } | null>(null)
  const [referenceResult, setReferences] = useState<{
    tree: ProjectTree
    items: Array<{ path: string; line: number; column: number }>
  } | null>(null)
  const symbols =
    symbolResult?.tree === tree && symbolResult.path === path ? symbolResult.items : []
  const references = referenceResult?.tree === tree ? referenceResult.items : []
  const [rename, setRename] = useState<{
    path: string
    content: string
    offset: number
    name: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const current = useRef({ path, tree })
  current.current = { path, tree }
  const content = tree[path]?.kind === 'file' ? tree[path].content : ''
  useEffect(() => {
    if (!open || !language.current || !/\.[cm]?[jt]sx?$/.test(path)) {
      setSymbols(null)
      return
    }
    let active = true
    void language.current
      .requestForTree(tree, 'symbols', path)
      .then((items) => {
        if (active) setSymbols({ tree, path, items })
      })
      .catch((cause: unknown) => {
        if (active)
          setError(cause instanceof Error ? cause.message : 'Não foi possível ler o mapa.')
      })
    return () => {
      active = false
    }
  }, [open, path, tree, language])
  const capture = () => {
    const model = editor.current?.getModel(),
      cursor = editor.current?.getPosition()
    const modelPath = model ? getMonacoModelPath(model) : ''
    if (
      !model ||
      !cursor ||
      modelPath.slice(modelPath.indexOf('/') + 1) !== path ||
      model.getValue() !== content
    ) {
      setError('Clique no nome dentro do código antes de usar esta ação.')
      return null
    }
    return {
      path,
      content,
      offset: model.getOffsetAt(cursor),
      name: model.getWordAtPosition(cursor)?.word ?? '',
    }
  }
  const findReferences = async () => {
    const selected = capture()
    if (!selected || !language.current) return
    setError(null)
    try {
      const items = await language.current.request('references', path, selected.offset)
      if (current.current.path !== path || current.current.tree !== tree) return
      const results = items
        .flatMap((item) => {
          const node = tree[item.path]
          return node?.kind === 'file'
            ? [{ path: item.path, ...proSourcePosition(node.content, item.span.start) }]
            : []
        })
        .slice(0, 100)
      setReferences({ tree, items: results })
      if (!results.length) setError('Nenhuma referência encontrada para esse nome no projeto.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível buscar as referências.')
    }
  }
  const commands: ProCommand[] = [
    ...(help
      ? (['explain', 'investigate', 'change'] as const).map(
          (intent): ProCommand => ({
            id: intent,
            label:
              intent === 'explain'
                ? 'Explicar trecho com Zappy'
                : intent === 'investigate'
                  ? 'Investigar trecho com Zappy'
                  : 'Pedir mudança nestas linhas',
            enabled: Boolean(path) && (intent !== 'change' || author),
            ...(intent === 'change' ? { shortcut: 'Ctrl/Cmd+Alt+K' } : {}),
            run: () => help(intent),
          }),
        )
      : []),
    { id: 'search', label: 'Buscar arquivo', shortcut: 'Ctrl/Cmd+P', enabled: true, run: search },
    {
      id: 'format',
      label: 'Organizar código',
      shortcut: 'Shift+Alt+F',
      enabled: Boolean(path) && author && !busy,
      run: format,
    },
    {
      id: 'materials',
      label: 'Abrir biblioteca de materiais',
      enabled: true,
      run: () => showAssets(true),
    },
    {
      id: 'references',
      label: 'Onde este nome aparece?',
      enabled: Boolean(path) && !busy,
      run: () => void findReferences(),
    },
    {
      id: 'rename',
      label: 'Renomear símbolo',
      enabled: Boolean(path) && author && !busy,
      run: () => {
        setError(null)
        setRename(capture())
      },
    },
    {
      id: 'recover',
      label: 'Recuperar arquivos e materiais',
      enabled: author && !busy,
      run: recover,
    },
    ...proCodeExamples(path).map(
      (example): ProCommand => ({
        id: `example:${example.id}`,
        label: `Inserir exemplo: ${example.label}`,
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
  return (
    <div className="shrink-0 border-b border-sz-border-soft px-2">
      <nav className="flex flex-wrap items-center gap-1" aria-label="Navegar no código">
        <button type="button" className={button} disabled={!canGoBack} onClick={back}>
          ← Voltar
        </button>
        <button
          type="button"
          className={button}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          Mapa do arquivo
        </button>
        <button
          type="button"
          className={button}
          onClick={() => {
            setQuery('')
            setToolsOpen(true)
          }}
        >
          Ferramentas…
        </button>
      </nav>
      <Modal
        open={toolsOpen}
        onClose={() => setToolsOpen(false)}
        title="Ferramentas do código"
        footer={<Button onClick={() => setToolsOpen(false)}>Voltar ao código</Button>}
      >
        <label className="block">
          O que você quer fazer?
          <input
            type="search"
            value={query}
            maxLength={100}
            onChange={(event) => setQuery(event.target.value)}
            className="my-2 block min-h-10 w-full rounded border border-sz-border bg-sz-bg px-3"
          />
        </label>
        <ul className="space-y-1">
          {findProCommands(commands, query).map((command) => (
            <li key={command.id}>
              <button
                type="button"
                disabled={!command.enabled}
                className={`${button} flex w-full items-center justify-between text-left`}
                onClick={() => {
                  setToolsOpen(false)
                  command.run()
                }}
              >
                <span>{command.label}</span>
                {command.shortcut && (
                  <span className="ml-3 text-sz-fg-mute">{command.shortcut}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
        {!findProCommands(commands, query).length && (
          <p role="status">Nenhuma ação com esse nome.</p>
        )}
        <p className="mt-3 text-xs">
          Exemplos são funções pequenas para conferir e conectar ao seu jogo. A paleta nativa do
          editor continua disponível pelo menu do código.
        </p>
      </Modal>
      {open && (
        <section className="max-h-40 overflow-auto pb-2" aria-label="Mapa do arquivo">
          {!symbols.length && (
            <p className="p-2 text-xs text-sz-fg-mute">Nenhum símbolo disponível neste arquivo.</p>
          )}
          {symbols.map((symbol) => (
            <button
              key={`${symbol.start}:${symbol.name}`}
              type="button"
              className={`${button} block w-full truncate text-left`}
              style={{ paddingLeft: `${8 + symbol.depth * 12}px` }}
              onClick={() => {
                const target = proSourcePosition(content, symbol.start)
                navigate(path, target.line, target.column)
              }}
            >
              {symbol.name}
            </button>
          ))}
        </section>
      )}
      {references.length > 0 && (
        <section className="max-h-40 overflow-auto pb-2" aria-label="Referências encontradas">
          <button type="button" className={button} onClick={() => setReferences(null)}>
            Fechar referências
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
      {rename && (
        <form
          className="flex flex-wrap items-center gap-2 py-2"
          onSubmit={(event) => {
            event.preventDefault()
            const node = tree[rename.path]
            if (node?.kind !== 'file' || node.content !== rename.content) {
              setError('O arquivo mudou. Selecione o nome novamente.')
              return
            }
            prepare({ kind: 'symbol', path: rename.path, offset: rename.offset, name: rename.name })
            setRename(null)
          }}
        >
          <label className="text-xs">
            Novo nome{' '}
            <input
              aria-label="Novo nome do símbolo"
              value={rename.name}
              onChange={(event) => setRename({ ...rename, name: event.target.value })}
              className="rounded border border-sz-border bg-sz-bg p-2"
            />
          </label>
          <button className={button} type="submit">
            Conferir referências
          </button>
          <button className={button} type="button" onClick={() => setRename(null)}>
            Cancelar
          </button>
        </form>
      )}
      {error && (
        <p role="status" className="py-2 text-xs text-sz-error">
          {error}{' '}
          <button type="button" onClick={() => setError(null)}>
            Fechar
          </button>
        </p>
      )}
    </div>
  )
}
