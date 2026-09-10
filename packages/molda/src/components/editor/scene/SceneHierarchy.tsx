import { useId, useState } from 'react'
import { COPY } from '../../../core/copy'
import type { ModelSceneNode } from '../../../scene/document'
import type { SceneIndex } from '../../../scene/graph'
import { Button } from '../../ui/Button'

/** Native nested lists/disclosures: every action is a real focusable button, including on touch. */
export function SceneHierarchy({
  index,
  selected,
  onSelect,
}: {
  index: SceneIndex<ModelSceneNode>
  selected: readonly string[]
  onSelect(id: string, additive: boolean): void
}) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set())
  const prefix = useId()
  const copy = COPY.scene
  function branch(ids: readonly string[], depth = 0) {
    return (
      <ul className="space-y-1">
        {ids.map((id) => {
          const node = index.nodes.get(id)
          if (!node) return null
          const children = index.children.get(id) ?? []
          const open = !collapsed.has(id)
          const childId = `${prefix}-${id}`
          return (
            <li key={id}>
              <div className="flex min-h-11 items-center gap-1">
                {children.length > 0 ? (
                  <Button
                    variant="ghost"
                    className="min-w-11 shrink-0 px-1"
                    aria-label={open ? copy.hide(node.name) : copy.show(node.name)}
                    aria-expanded={open}
                    aria-controls={childId}
                    onClick={() =>
                      setCollapsed((before) => {
                        const next = new Set(before)
                        if (next.has(id)) next.delete(id)
                        else next.add(id)
                        return next
                      })
                    }
                  >
                    {open ? '▾' : '▸'}
                  </Button>
                ) : (
                  <span aria-hidden="true" className="w-3 shrink-0" />
                )}
                <Button
                  variant="ghost"
                  aria-label={copy.select(node.name)}
                  aria-pressed={selected.includes(id)}
                  className={`min-w-0 flex-1 justify-start px-2 text-left text-sm ${selected.includes(id) ? 'bg-mld-accent/15 ring-1 ring-mld-accent' : ''}`}
                  onClick={(event) =>
                    onSelect(id, event.shiftKey || event.ctrlKey || event.metaKey)
                  }
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{node.name}</span>
                    <span className="block text-xs font-normal text-mld-muted">
                      {copy.nodeKind[node.kind]}
                      {node.hidden ? ` · ${copy.hiddenHint}` : ''}
                      {node.locked ? ` · ${copy.lockedHint}` : ''}
                    </span>
                  </span>
                </Button>
              </div>
              {children.length > 0 && (
                <div
                  id={childId}
                  hidden={!open}
                  className={depth < 4 ? 'ml-3 border-l border-mld-border pl-1' : ''}
                >
                  {branch(children, depth + 1)}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    )
  }
  return <section aria-label={copy.hierarchy}>{branch(index.roots)}</section>
}
