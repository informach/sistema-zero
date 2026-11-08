import type { JSX } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ProjectTree } from '#core'
import {
  cn,
  IconChevronDown,
  IconChevronRight,
  IconFile,
  IconFolder,
  IconLock,
  IconPlus,
  Menu,
} from '#ui'
import { isPythonProject } from '../../core/editableProject'
import { ProNewFileDialog } from '../../modes/pro/workspace/ProNewFileDialog'
import { useProjectStore } from '../../state/projectStore'
import type { ProWorkspaceIntent } from '../../state/proWorkspaceOperations'
import { useT } from '../../studio/i18n'
import { isProConfigPath, proFileKind } from './proFileKinds'
import { buildTreeView, type TreeViewNode } from './proTreeView'

export interface ProFileTreeProps {
  activeFile: string
  onSelectFile: (path: string) => void
  onPinFile?: (path: string) => void
  collapsedPaths?: readonly string[]
  onCollapsedChange?: (paths: string[]) => void
  descriptions?: Readonly<Record<string, string>>
  revealRequest?: number
  onRequestOperation?: (intent: ProWorkspaceIntent) => void
  operationsBusy?: boolean
}

const EMPTY_TREE: ProjectTree = {}

/**
 * Os arquivos do projeto Pro (redesenho de 11/2026): cada linha diz o que o arquivo É (o
 * ladrilho da linguagem, o nome curto e uma frase de apoio: "Onde o jogo começa", "Como o jogo
 * fica: cores e tamanhos"…). Os arquivos que dizem como o jogo é MONTADO moram na gaveta
 * "Configuração" (fechada por padrão, "Só mexa se um guia pedir"). Mudar o nome, copiar o
 * caminho e apagar passam pelo ⋯ de cada linha (os ↗ e × de 12px saíram), e "Novo" abre a
 * janela "Criar um arquivo". Renomear e apagar continuam pedindo a REVISÃO semântica
 * (`onRequestOperation`) antes de mexer na árvore. O `treeitem` com o caminho inteiro no nome
 * acessível e a navegação por teclado (setas, Home, End, F2) seguem iguais.
 */
export function ProFileTree({
  activeFile,
  onSelectFile,
  onPinFile,
  collapsedPaths,
  onCollapsedChange,
  descriptions,
  revealRequest = 0,
  onRequestOperation,
  operationsBusy = false,
}: ProFileTreeProps): JSX.Element {
  const t = useT()
  const tree = useProjectStore((s) => s.project?.tree ?? EMPTY_TREE)
  const addProFile = useProjectStore((s) => s.addProFile)
  const addProDir = useProjectStore((s) => s.addProDir)
  const observer = useProjectStore((s) => s.editingAccess === 'observer')
  const python = useProjectStore((s) => s.project?.programmingLanguage === 'python')
  const entrypoint = useProjectStore((s) =>
    s.project && isPythonProject(s.project) ? s.project.python.entrypoint : null,
  )

  const roots = useMemo(() => buildTreeView(tree), [tree])
  const yours = roots.filter((node) => !isProConfigPath(node.path))
  const config = roots.filter((node) => isProConfigPath(node.path))
  const [configOpen, setConfigOpen] = useState(() => isProConfigPath(activeFile))
  const [localCollapsed, setLocalCollapsed] = useState<string[]>([])
  const collapsed = new Set(collapsedPaths ?? localCollapsed)
  const setCollapsed = (update: (previous: Set<string>) => Set<string>) => {
    const next = [...update(collapsed)]
    if (onCollapsedChange) onCollapsedChange(next)
    else setLocalCollapsed(next)
  }
  const [creating, setCreating] = useState<{ base?: string } | null>(null)
  const [renaming, setRenaming] = useState<{ from: string; to: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const renameInputRef = useRef<HTMLInputElement | null>(null)
  const fileButtons = useRef(new Map<string, HTMLButtonElement>())
  const [focused, setFocused] = useState('')
  const canEdit = !observer && !operationsBusy && Boolean(onRequestOperation)
  const visible: TreeViewNode[] = []
  const collect = (nodes: TreeViewNode[]) => {
    for (const node of nodes) {
      visible.push(node)
      if (node.kind === 'dir' && !collapsed.has(node.path)) collect(node.children)
    }
  }
  collect(yours)
  if (configOpen) collect(config)
  const focusPath = visible.some((node) => node.path === focused) ? focused : visible[0]?.path

  // Abrir um arquivo de configuração (pelo "Ir para um arquivo", por um guia) abre a gaveta.
  useEffect(() => {
    if (isProConfigPath(activeFile)) setConfigOpen(true)
  }, [activeFile])
  useEffect(() => {
    if (!revealRequest) return
    const button = fileButtons.current.get(activeFile)
    button?.focus()
    button?.scrollIntoView?.({ block: 'nearest' })
  }, [activeFile, revealRequest])
  useEffect(() => {
    if (!renaming) return
    renameInputRef.current?.focus()
    renameInputRef.current?.select()
  }, [renaming])

  const toggle = (path: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }
  const handleRenameSave = () => {
    if (!renaming) return
    onRequestOperation?.({ kind: 'rename', from: renaming.from, to: renaming.to.trim() })
    setRenaming(null)
    setError(null)
  }
  const copyPath = async (path: string) => {
    try {
      await navigator.clipboard.writeText(path)
      setStatus(t('pro.files.copied'))
    } catch {
      setStatus(t('pro.files.copyFailed'))
    }
  }

  const renderNode = (node: TreeViewNode, index: number, siblings: TreeViewNode[]): JSX.Element => {
    const isDir = node.kind === 'dir'
    const isCollapsed = collapsed.has(node.path)
    const isActive = activeFile === node.path
    const isRenaming = renaming?.from === node.path
    const kind = proFileKind(node.path, { kind: node.kind, entrypoint })
    const hint = isDir
      ? node.children.length
        ? t(node.children.length === 1 ? 'pro.files.item' : 'pro.files.items', {
            count: node.children.length,
          })
        : t('pro.files.empty')
      : (descriptions?.[node.path] ?? t(kind.descriptionKey))
    return (
      <div key={node.path}>
        <div
          className={cn('sz-pro-row-wrap group flex items-center gap-1', isActive && 'is-active')}
          style={{ paddingLeft: `${node.depth * 16}px` }}
        >
          {isRenaming ? (
            <div className="flex min-h-14 flex-1 flex-col justify-center gap-1 px-2">
              <input
                ref={renameInputRef}
                name="rename-pro-node"
                aria-label={t('pro.files.renameField', { name: node.name })}
                autoComplete="off"
                value={renaming.to}
                onChange={(e) => setRenaming({ from: node.path, to: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameSave()
                  if (e.key === 'Escape') {
                    setRenaming(null)
                    setError(null)
                  }
                }}
                className="min-h-10 rounded-xl border-2 border-sz-accent bg-sz-bg px-2 font-mono text-sm text-sz-fg"
              />
              <span className="text-xs text-sz-fg-soft">{t('pro.files.renameHint')}</span>
            </div>
          ) : (
            <button
              role="treeitem"
              aria-label={node.path}
              aria-level={node.depth + 1}
              aria-posinset={index + 1}
              aria-setsize={siblings.length}
              aria-selected={!isDir && isActive}
              aria-expanded={isDir ? !isCollapsed : undefined}
              tabIndex={node.path === focusPath ? 0 : -1}
              onFocus={() => setFocused(node.path)}
              onKeyDown={(event) => {
                const position = visible.findIndex((item) => item.path === node.path)
                let next: string | undefined
                if (event.key === 'ArrowDown')
                  next = visible[Math.min(visible.length - 1, position + 1)]?.path
                else if (event.key === 'ArrowUp') next = visible[Math.max(0, position - 1)]?.path
                else if (event.key === 'Home') next = visible[0]?.path
                else if (event.key === 'End') next = visible.at(-1)?.path
                else if (event.key === 'ArrowRight') {
                  if (isDir && isCollapsed) toggle(node.path)
                  else if (isDir) next = node.children[0]?.path
                } else if (event.key === 'ArrowLeft') {
                  if (isDir && !isCollapsed) toggle(node.path)
                  else if (node.path.includes('/'))
                    next = node.path.slice(0, node.path.lastIndexOf('/'))
                } else if (event.key === 'F2' && canEdit) {
                  setRenaming({ from: node.path, to: node.path })
                } else return
                event.preventDefault()
                if (next) fileButtons.current.get(next)?.focus()
              }}
              ref={(button) => {
                if (button) fileButtons.current.set(node.path, button)
                else fileButtons.current.delete(node.path)
              }}
              type="button"
              onClick={() => (isDir ? toggle(node.path) : onSelectFile(node.path))}
              onDoubleClick={() => {
                if (!isDir && onPinFile) onPinFile(node.path)
              }}
              className="sz-pro-row min-w-0 flex-1"
              title={node.path}
            >
              {/* A seta da pasta (ou o mesmo espaço vazio no arquivo): os ladrilhos de um mesmo
                  nível ficam alinhados. */}
              <span aria-hidden="true" className="-mr-1 flex w-4 flex-none text-sz-fg-soft">
                {isDir ? (
                  isCollapsed ? (
                    <IconChevronRight size={16} />
                  ) : (
                    <IconChevronDown size={16} />
                  )
                ) : null}
              </span>
              <span aria-hidden="true" className={cn('sz-pro-tile', `sz-pro-tile--${kind.tone}`)}>
                {kind.short || (isDir ? <IconFolder /> : kind.config ? <IconLock /> : <IconFile />)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="sz-pro-row__name">{node.name}</span>
                <span className="sz-pro-row__hint">{hint}</span>
              </span>
            </button>
          )}
          {isRenaming ? (
            <button
              type="button"
              onClick={handleRenameSave}
              className="sz-pro-btn sz-pro-btn--sm sz-pro-btn--primary"
            >
              {t('pro.files.renameCheck')}
            </button>
          ) : (
            <Menu
              trigger={<span aria-hidden="true">⋯</span>}
              label={t('pro.files.options', { path: node.path })}
              className={cn('sz-pro-row__more', !isActive && 'sz-pro-row__more--quiet')}
              sections={[
                {
                  id: 'node',
                  items: [
                    ...(isDir
                      ? [
                          {
                            id: 'newHere',
                            label: t('pro.files.newHere'),
                            disabled: observer || operationsBusy,
                            onSelect: () => {
                              setError(null)
                              setCreating({ base: node.path })
                              setCollapsed((prev) => {
                                const next = new Set(prev)
                                next.delete(node.path)
                                return next
                              })
                            },
                          },
                        ]
                      : []),
                    {
                      id: 'rename',
                      label: t('pro.files.rename'),
                      disabled: !canEdit,
                      onSelect: () => setRenaming({ from: node.path, to: node.path }),
                    },
                    {
                      id: 'copy',
                      label: t('pro.files.copyPath'),
                      onSelect: () => void copyPath(node.path),
                    },
                    {
                      id: 'delete',
                      label: t('pro.files.delete'),
                      disabled: !canEdit,
                      onSelect: () => onRequestOperation?.({ kind: 'delete', path: node.path }),
                    },
                  ],
                },
              ]}
            />
          )}
        </div>
        {isDir && !isCollapsed && node.children.map(renderNode)}
      </div>
    )
  }

  return (
    <aside className="flex h-full w-full flex-col bg-sz-panel">
      <header className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
        <h2 className="m-0 text-base font-black">{t('pro.files')}</h2>
        <button
          type="button"
          className="sz-pro-btn sz-pro-btn--sm sz-pro-btn--primary"
          disabled={observer || operationsBusy}
          onClick={() => {
            setError(null)
            setCreating({})
          }}
        >
          <IconPlus />
          <span>{t('pro.files.new')}</span>
        </button>
      </header>
      <div className="flex-1 overflow-auto px-2 pb-2">
        <p className="sz-pro-section-label">{t('pro.files.yours')}</p>
        <div role="tree" aria-label={t('pro.files.tree')}>
          {yours.map(renderNode)}
        </div>
        {config.length > 0 ? (
          <div className="mt-2 border-t border-sz-border-soft pt-2">
            <button
              type="button"
              className="sz-pro-row min-h-11"
              aria-expanded={configOpen}
              onClick={() => setConfigOpen((open) => !open)}
            >
              <span aria-hidden="true" className="flex w-4 flex-none text-sz-fg-soft">
                {configOpen ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="sz-pro-row__name">
                  {t('pro.files.config')} · {config.length}
                </span>
                <span className="sz-pro-row__hint">{t('pro.files.configHint')}</span>
              </span>
            </button>
            {configOpen ? (
              <div role="tree" aria-label={t('pro.files.config')}>
                {config.map(renderNode)}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      {error && (
        <p role="alert" className="px-3 pb-2 text-xs text-sz-error">
          {error}
        </p>
      )}
      <p role="status" className="sr-only">
        {status}
      </p>
      <ProNewFileDialog
        open={creating !== null}
        tree={tree}
        python={python}
        initialBase={creating?.base}
        onClose={() => setCreating(null)}
        create={(path, kind) => {
          const issue = kind === 'file' ? addProFile(path) : addProDir(path)
          if (!issue && kind === 'file') onSelectFile(path)
          return issue
        }}
      />
    </aside>
  )
}
