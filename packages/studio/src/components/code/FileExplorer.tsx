import type { JSX } from 'react'
import { useEffect, useRef, useState } from 'react'
import { CANONICAL_FILES, type ExtraFile, FILE_NAMES, normalizeExtraFileName } from '#core'
import { Button, ConfirmDialog } from '#ui'
import { useProjectStore } from '../../state/projectStore'

export interface FileExplorerProps {
  activeFile: string
  onSelectFile: (name: string) => void
}

const EMPTY_EXTRA_FILES: ExtraFile[] = []

export function FileExplorer({ activeFile, onSelectFile }: FileExplorerProps): JSX.Element {
  const hasProject = useProjectStore((s) => Boolean(s.project))
  const extras = useProjectStore((s) => s.project?.extraFiles ?? EMPTY_EXTRA_FILES)
  const addExtraFile = useProjectStore((s) => s.addExtraFile)
  const removeExtraFile = useProjectStore((s) => s.removeExtraFile)
  const renameExtraFile = useProjectStore((s) => s.renameExtraFile)

  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<{ from: string; to: string } | null>(null)
  // Arquivo extra aguardando confirmação de exclusão (evita apagar por engano).
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const renameInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!renaming) return
    renameInputRef.current?.focus()
    renameInputRef.current?.select()
  }, [renaming])

  if (!hasProject) return <div />

  const handleAdd = () => {
    const err = addExtraFile(newName)
    if (err) {
      setError(err)
      return
    }
    onSelectFile(normalizeExtraFileName(newName) ?? newName.trim())
    setNewName('')
    setError(null)
  }

  const handleRenameSave = () => {
    if (!renaming) return
    const err = renameExtraFile(renaming.from, renaming.to)
    if (err) {
      setError(err)
      return
    }
    if (activeFile === renaming.from) {
      onSelectFile(normalizeExtraFileName(renaming.to) ?? renaming.to.trim())
    }
    setRenaming(null)
    setError(null)
  }

  const handleConfirmDelete = () => {
    if (!pendingDelete) return
    removeExtraFile(pendingDelete)
    if (activeFile === pendingDelete) onSelectFile('script.js')
    setPendingDelete(null)
  }

  return (
    <aside className="flex h-full w-full flex-col border-r border-sz-border bg-sz-panel text-xs">
      <header className="border-b border-sz-border-soft px-3 py-2 text-xs font-semibold uppercase text-sz-fg-mute">
        Arquivos
      </header>
      <div className="flex-1 overflow-auto px-1 py-1">
        <div className="px-2 py-1 text-xs text-sz-fg-mute uppercase">Canônicos</div>
        {FILE_NAMES.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => onSelectFile(name)}
            className={[
              'block w-full rounded px-2 py-1 text-left font-mono text-xs',
              activeFile === name
                ? 'bg-sz-accent/15 text-sz-accent'
                : 'text-sz-fg-soft hover:bg-sz-panel-soft',
            ].join(' ')}
          >
            {name}
          </button>
        ))}
        {extras.length > 0 && (
          <>
            <div className="mt-2 px-2 py-1 text-xs text-sz-fg-mute uppercase">Extras</div>
            {extras.map((file) => {
              const isActive = activeFile === file.name
              const isRenaming = renaming?.from === file.name
              return (
                <div
                  key={file.name}
                  className={[
                    'flex items-center gap-1 rounded px-2 py-1 font-mono text-xs',
                    isActive
                      ? 'bg-sz-accent/15 text-sz-accent'
                      : 'text-sz-fg-soft hover:bg-sz-panel-soft',
                  ].join(' ')}
                >
                  {isRenaming ? (
                    <input
                      ref={renameInputRef}
                      name="rename-extra-file"
                      aria-label={`Renomear ${file.name}`}
                      autoComplete="off"
                      value={renaming.to}
                      onChange={(e) => setRenaming({ from: file.name, to: e.target.value })}
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
                      onClick={() => onSelectFile(file.name)}
                      onDoubleClick={() => {
                        if (!CANONICAL_FILES.has(file.name))
                          setRenaming({ from: file.name, to: file.name })
                      }}
                      className="flex-1 truncate text-left"
                      title="Duplo clique para renomear"
                    >
                      {file.name}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPendingDelete(file.name)}
                    title="Excluir arquivo"
                    aria-label={`Excluir ${file.name}`}
                    className="text-sz-fg-mute hover:text-sz-error"
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </div>
              )
            })}
          </>
        )}
      </div>
      <footer className="space-y-1 border-t border-sz-border-soft p-2">
        <input
          name="new-extra-file"
          aria-label="Nome do novo arquivo"
          autoComplete="off"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd()
          }}
          placeholder="novo.js"
          className="w-full rounded border border-sz-border bg-sz-bg px-2 py-1 font-mono text-xs text-sz-fg placeholder:text-sz-fg-mute"
        />
        <Button size="sm" variant="primary" onClick={handleAdd} className="w-full justify-center">
          + Novo arquivo
        </Button>
        {error && <p className="text-xs text-sz-error">{error}</p>}
      </footer>
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Excluir arquivo?"
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        danger
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      >
        <p>
          Tem certeza que deseja excluir{' '}
          <span className="font-mono font-semibold">{pendingDelete}</span>? Essa ação não pode ser
          desfeita.
        </p>
      </ConfirmDialog>
    </aside>
  )
}
