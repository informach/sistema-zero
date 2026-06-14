import type { JSX } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ProjectTree } from '#core'
import { Button, ConfirmDialog } from '#ui'
import { useProjectStore } from '../../state/projectStore'
import { buildTreeView, type TreeViewNode } from './proTreeView'

export interface ProFileTreeProps {
  activeFile: string
  onSelectFile: (path: string) => void
}

const EMPTY_TREE: ProjectTree = {}

export function ProFileTree({ activeFile, onSelectFile }: ProFileTreeProps): JSX.Element {
  const tree = useProjectStore((s) => s.project?.tree ?? EMPTY_TREE)
  const addProFile = useProjectStore((s) => s.addProFile)
  const addProDir = useProjectStore((s) => s.addProDir)
  const renameProNode = useProjectStore((s) => s.renameProNode)
  const removeProNode = useProjectStore((s) => s.removeProNode)

  const roots = useMemo(() => buildTreeView(tree), [tree])
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  const [creating, setCreating] = useState<{ kind: 'file' | 'dir'; base: string } | null>(null)
  const [newName, setNewName] = useState('')
  const [renaming, setRenaming] = useState<{ from: string; to: string } | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const renameInputRef = useRef<HTMLInputElement | null>(null)

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
    const slash = renaming.from.lastIndexOf('/')
    const base = slash < 0 ? '' : renaming.from.slice(0, slash)
    const to = base ? `${base}/${renaming.to.trim()}` : renaming.to.trim()
    const err = renameProNode(renaming.from, to)
    if (err) {
      setError(err)
      return
    }
    if (activeFile === renaming.from) onSelectFile(to)
    setRenaming(null)
    setError(null)
  }

  const handleConfirmDelete = () => {
    if (!pendingDelete) return
    removeProNode(pendingDelete)
    if (activeFile === pendingDelete || activeFile.startsWith(`${pendingDelete}/`)) {
      const firstFile = Object.entries(tree).find(
        ([p, n]) => n.kind === 'file' && p !== pendingDelete && !p.startsWith(`${pendingDelete}/`),
      )
      if (firstFile) onSelectFile(firstFile[0])
    }
    setPendingDelete(null)
  }

  const renderNode = (node: TreeViewNode): JSX.Element => {
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
              onBlur={handleRenameSave}
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
              type="button"
              onClick={() => (isDir ? toggle(node.path) : onSelectFile(node.path))}
              onDoubleClick={() => setRenaming({ from: node.path, to: node.name })}
              className="flex flex-1 items-center gap-1 truncate text-left"
              title="Duplo clique para renomear"
            >
              <span aria-hidden="true" className="text-sz-fg-mute">
                {isDir ? (isCollapsed ? '▸' : '▾') : '·'}
              </span>
              <span className="truncate">{node.name}</span>
            </button>
          )}
          {isDir && (
            <button
              type="button"
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
              className="opacity-0 group-hover:opacity-100 text-sz-fg-mute hover:text-sz-accent"
            >
              <span aria-hidden="true">+</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setPendingDelete(node.path)}
            title="Excluir"
            aria-label={`Excluir ${node.path}`}
            className="opacity-0 group-hover:opacity-100 text-sz-fg-mute hover:text-sz-error"
          >
            <span aria-hidden="true">×</span>
          </button>
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
      <div className="flex-1 overflow-auto px-1 py-1">{roots.map(renderNode)}</div>
      {creating && (
        <div className="space-y-1 border-t border-sz-border-soft p-2">
          <p className="text-xs text-sz-fg-mute">
            {creating.kind === 'file' ? 'Novo arquivo' : 'Nova pasta'}
            {creating.base ? ` em ${creating.base}/` : ' na raiz'}
          </p>
          <input
            name="new-pro-node"
            aria-label="Nome do novo item"
            autoComplete="off"
            // biome-ignore lint/a11y/noAutofocus: foco esperado ao abrir o campo de criação
            autoFocus
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
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Excluir item?"
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        danger
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      >
        <p>
          Tem certeza que deseja excluir{' '}
          <span className="font-mono font-semibold">{pendingDelete}</span>? Se for uma pasta, todo o
          conteúdo será removido. Essa ação não pode ser desfeita.
        </p>
      </ConfirmDialog>
    </aside>
  )
}
