import type { JSX } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ProjectTree } from '#core'
import { Button } from '#ui'
import { useProjectStore } from '../../state/projectStore'
import type { ProWorkspaceIntent } from '../../state/proWorkspaceOperations'
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
  const tree = useProjectStore((s) => s.project?.tree ?? EMPTY_TREE)
  const addProFile = useProjectStore((s) => s.addProFile)
  const addProDir = useProjectStore((s) => s.addProDir)
  const observer = useProjectStore((s) => s.editingAccess === 'observer')

  const roots = useMemo(() => buildTreeView(tree), [tree])
  const [localCollapsed, setLocalCollapsed] = useState<string[]>([])
  const collapsed = new Set(collapsedPaths ?? localCollapsed)
  const setCollapsed = (update: (previous: Set<string>) => Set<string>) => {
    const next = [...update(collapsed)]
    if (onCollapsedChange) onCollapsedChange(next)
    else setLocalCollapsed(next)
  }
  const [creating, setCreating] = useState<{ kind: 'file' | 'dir'; base: string } | null>(null)
  const [newName, setNewName] = useState('')
  const [renaming, setRenaming] = useState<{ from: string; to: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const renameInputRef = useRef<HTMLInputElement | null>(null)
  const createInputRef = useRef<HTMLInputElement | null>(null)
  const fileButtons = useRef(new Map<string, HTMLButtonElement>())
  const [focused, setFocused] = useState('')
  const visible: TreeViewNode[] = []
  const collect = (nodes: TreeViewNode[]) => {
    for (const node of nodes) {
      visible.push(node)
      if (node.kind === 'dir' && !collapsed.has(node.path)) collect(node.children)
    }
  }
  collect(roots)
  const focusPath = visible.some((node) => node.path === focused) ? focused : visible[0]?.path
  useEffect(() => {
    if (!revealRequest) return
    const button = fileButtons.current.get(activeFile)
    button?.focus()
    button?.scrollIntoView({ block: 'nearest' })
  }, [activeFile, revealRequest])

  useEffect(() => {
    if (!renaming) return
    renameInputRef.current?.focus()
    renameInputRef.current?.select()
  }, [renaming])

  // O `autoFocus` nativo só dispara na montagem do input. Como o campo de criação
  // é reutilizado (clicar no + de outra pasta com o form aberto só troca
  // `creating.base`, sem remontar), focamos via effect a cada (re)abertura.
  useEffect(() => {
    if (!creating) return
    createInputRef.current?.focus()
  }, [creating])

  const toggle = (path: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const handleCreate = () => {
    if (!creating) return
    const path = creating.base ? `${creating.base}/${newName.trim()}` : newName.trim()
    const err = creating.kind === 'file' ? addProFile(path) : addProDir(path)
    if (err) {
      setError(err)
      return
    }
    if (creating.kind === 'file') onSelectFile(path)
    setCreating(null)
    setNewName('')
    setError(null)
  }

  const handleRenameSave = () => {
    if (!renaming) return
    onRequestOperation?.({ kind: 'rename', from: renaming.from, to: renaming.to.trim() })
    setRenaming(null)
    setError(null)
  }

  const renderNode = (node: TreeViewNode, index: number, siblings: TreeViewNode[]): JSX.Element => {
    const isDir = node.kind === 'dir'
    const isCollapsed = collapsed.has(node.path)
    const isActive = activeFile === node.path
    const isRenaming = renaming?.from === node.path
    return (
      <div key={node.path}>
        <div
          className={[
            'group flex items-center gap-1 rounded px-1 py-0.5 font-mono text-xs',
            isActive ? 'bg-sz-accent/15 text-sz-accent' : 'text-sz-fg-soft hover:bg-sz-panel-soft',
          ].join(' ')}
          style={{ paddingLeft: `${node.depth * 12 + 4}px` }}
        >
          {isRenaming ? (
            <input
              ref={renameInputRef}
              name="rename-pro-node"
              aria-label={`Renomear ${node.name}`}
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
              className="flex-1 rounded border border-sz-border bg-sz-bg px-1 py-0.5 text-xs text-sz-fg"
            />
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
                  else next = node.path.slice(0, node.path.lastIndexOf('/'))
                } else if (
                  event.key === 'F2' &&
                  !observer &&
                  !operationsBusy &&
                  onRequestOperation
                ) {
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
              onDoubleClick={() =>
                !isDir && onPinFile
                  ? onPinFile(node.path)
                  : !observer &&
                    onRequestOperation &&
                    setRenaming({ from: node.path, to: node.path })
              }
              className="flex flex-1 items-center gap-1 truncate text-left"
              title={
                !isDir && onPinFile ? 'Duplo clique para fixar a aba' : 'Duplo clique para renomear'
              }
            >
              <span aria-hidden="true" className="text-sz-fg-mute">
                {isDir ? (isCollapsed ? '▸' : '▾') : '·'}
              </span>
              <span className="min-w-0 py-1">
                <span className="block truncate">{node.name}</span>
                {descriptions?.[node.path] && (
                  <span
                    className="block truncate font-sans text-xs text-sz-fg-mute"
                    title={descriptions[node.path]}
                  >
                    {descriptions[node.path]}
                  </span>
                )}
              </span>
            </button>
          )}
          {isDir && (
            <button
              type="button"
              disabled={observer || operationsBusy}
              onClick={() => {
                setCreating({ kind: 'file', base: node.path })
                setNewName('')
                setError(null)
                setCollapsed((prev) => {
                  const next = new Set(prev)
                  next.delete(node.path)
                  return next
                })
              }}
              title="Novo arquivo nesta pasta"
              aria-label={`Novo arquivo em ${node.path}`}
              className="min-h-6 min-w-6 text-sz-fg-mute hover:text-sz-accent focus-visible:outline disabled:opacity-40"
            >
              <span aria-hidden="true">+</span>
            </button>
          )}
          <button
            type="button"
            disabled={observer || operationsBusy || !onRequestOperation}
            onClick={() => setRenaming({ from: node.path, to: node.path })}
            aria-label={`Renomear ou mover ${node.path}`}
            title="Renomear ou mover — informe o caminho completo"
            className="min-h-6 min-w-6 text-sz-fg-mute hover:text-sz-accent disabled:opacity-40"
          >
            ↗
          </button>
          <button
            type="button"
            disabled={observer || operationsBusy || !onRequestOperation}
            onClick={() => onRequestOperation?.({ kind: 'delete', path: node.path })}
            title="Excluir"
            aria-label={`Excluir ${node.path}`}
            className="min-h-6 min-w-6 text-sz-fg-mute hover:text-sz-error disabled:opacity-40"
          >
            <span aria-hidden="true">×</span>
          </button>
          {isRenaming && (
            <button
              type="button"
              onClick={handleRenameSave}
              className="min-h-8 px-2 text-sz-accent"
            >
              Conferir
            </button>
          )}
        </div>
        {isDir && !isCollapsed && node.children.map(renderNode)}
      </div>
    )
  }

  return (
    <aside className="flex h-full w-full flex-col border-r border-sz-border bg-sz-panel text-xs">
      <header className="flex items-center justify-between border-b border-sz-border-soft px-3 py-2">
        <span className="text-xs font-semibold uppercase text-sz-fg-mute">Arquivos</span>
        <div className="flex gap-1">
          <button
            type="button"
            disabled={observer || operationsBusy}
            onClick={() => {
              setCreating({ kind: 'file', base: '' })
              setNewName('')
              setError(null)
            }}
            title="Novo arquivo na raiz"
            className="text-sz-fg-mute hover:text-sz-accent"
          >
            <span aria-hidden="true">+arquivo</span>
          </button>
          <button
            type="button"
            disabled={observer || operationsBusy}
            onClick={() => {
              setCreating({ kind: 'dir', base: '' })
              setNewName('')
              setError(null)
            }}
            title="Nova pasta na raiz"
            className="text-sz-fg-mute hover:text-sz-accent"
          >
            <span aria-hidden="true">+pasta</span>
          </button>
        </div>
      </header>
      <div role="tree" aria-label="Arquivos do projeto" className="flex-1 overflow-auto px-1 py-1">
        {roots.map(renderNode)}
      </div>
      {creating && (
        <div className="space-y-1 border-t border-sz-border-soft p-2">
          <p className="text-xs text-sz-fg-mute">
            {creating.kind === 'file' ? 'Novo arquivo' : 'Nova pasta'}
            {creating.base ? ` em ${creating.base}/` : ' na raiz'}
          </p>
          <input
            ref={createInputRef}
            name="new-pro-node"
            aria-label="Nome do novo item"
            autoComplete="off"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate()
              if (e.key === 'Escape') {
                setCreating(null)
                setError(null)
              }
            }}
            placeholder={creating.kind === 'file' ? 'arquivo.ts' : 'pasta'}
            className="w-full rounded border border-sz-border bg-sz-bg px-2 py-1 font-mono text-xs text-sz-fg placeholder:text-sz-fg-mute"
          />
          <p className="text-xs text-sz-fg-mute">
            Use letras sem acentos, números, ponto, hífen ou sublinhado. Para escolher outra pasta,
            escreva o caminho com /.
          </p>
          {newName !==
            newName
              .normalize('NFKD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/\s+/g, '-') && (
            <button
              type="button"
              className="min-h-8 text-xs text-sz-accent"
              onClick={() =>
                setNewName(
                  newName
                    .normalize('NFKD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/\s+/g, '-'),
                )
              }
            >
              Usar sugestão:{' '}
              {newName
                .normalize('NFKD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, '-')}
            </button>
          )}
          <div className="flex gap-1">
            <Button size="sm" variant="primary" onClick={handleCreate} className="flex-1">
              Criar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setCreating(null)
                setError(null)
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
      {error && <p className="px-2 pb-2 text-xs text-sz-error">{error}</p>}
    </aside>
  )
}
