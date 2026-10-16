import { useEffect, useId, useMemo, useState } from 'react'
import { Modal } from '#ui'
import type { ProjectTree } from '../../../core/proProject'
import { useT } from '../../../studio/i18n'
import { searchProFiles } from './search'

export function ProQuickOpen({
  tree,
  recent,
  initialQuery = '',
  onClose,
  onSelect,
}: {
  tree: ProjectTree
  recent: readonly string[]
  initialQuery?: string
  onClose(): void
  onSelect(path: string): void
}) {
  const t = useT()
  const [query, setQuery] = useState(initialQuery)
  const [index, setIndex] = useState(0)
  const id = useId()
  const paths = useMemo(
    () =>
      query.trim()
        ? searchProFiles(tree, query, 'files', 100).items.map((item) => item.path)
        : [...new Set([...recent, ...Object.keys(tree).sort()])]
            .filter((path) => tree[path]?.kind === 'file')
            .slice(0, 100),
    [tree, query, recent],
  )
  const selected = paths[Math.min(index, paths.length - 1)]
  useEffect(() => {
    document
      .getElementById(`${id}-${Math.min(index, paths.length - 1)}`)
      ?.scrollIntoView?.({ block: 'nearest' })
  }, [id, index, paths.length])
  const choose = (path: string) => {
    if (tree[path]?.kind === 'file') {
      onClose()
      onSelect(path)
    }
  }
  return (
    <Modal open onClose={onClose} title={t('pro.quickOpen')}>
      <label htmlFor={`${id}-input`}>{t('pro.searchFiles')}</label>
      <input
        id={`${id}-input`}
        role="combobox"
        aria-expanded="true"
        aria-autocomplete="list"
        aria-controls={`${id}-list`}
        aria-activedescendant={selected ? `${id}-${Math.min(index, paths.length - 1)}` : undefined}
        value={query}
        maxLength={160}
        onChange={(event) => {
          setQuery(event.target.value)
          setIndex(0)
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            setIndex((value) =>
              Math.max(0, Math.min(paths.length - 1, value + (event.key === 'ArrowDown' ? 1 : -1))),
            )
          } else if (event.key === 'Enter' && selected) {
            event.preventDefault()
            choose(selected)
          }
        }}
        className="my-2 min-h-10 w-full rounded border border-sz-border bg-sz-bg px-3"
      />
      <p className="mb-2 text-xs text-sz-fg-mute">{t('pro.quickOpenHint')}</p>
      <div
        id={`${id}-list`}
        role="listbox"
        aria-label={t('pro.files')}
        className="max-h-80 overflow-auto"
      >
        {paths.map((path, position) => (
          <button
            key={path}
            id={`${id}-${position}`}
            type="button"
            role="option"
            aria-selected={selected === path}
            tabIndex={-1}
            onClick={() => choose(path)}
            className="block min-h-9 w-full break-all rounded px-2 py-1 text-left font-mono text-xs aria-selected:bg-sz-accent/15 hover:bg-sz-bg"
          >
            {path}
          </button>
        ))}
      </div>
      {!paths.length && <p role="status">{t('pro.noFiles')}</p>}
    </Modal>
  )
}
