import { useId, useState } from 'react'
import { COPY } from '../../../core/copy'
import type { ModelSceneNode } from '../../../scene/document'
import type { SceneIndex } from '../../../scene/graph'
import { Button } from '../../ui/Button'
import {
  Box,
  Circle,
  Crosshair,
  Cylinder,
  Eye,
  EyeOff,
  Group,
  Lock,
  type LucideIcon,
  Spline,
  TriangleRight,
  Waypoints,
} from '../../ui/icons'

/** A forma que cada linha mostra no ladrilho colorido: a da geometria, ou o tipo do nó. */
export type SceneHierarchyShape =
  | 'box'
  | 'wedge'
  | 'cylinder'
  | 'sphere'
  | 'mesh'
  | 'path'
  | 'group'
  | 'locator'

const SHAPE_LOOK: Record<SceneHierarchyShape, [LucideIcon, string]> = {
  box: [Box, 'var(--mld-fill-box)'],
  wedge: [TriangleRight, 'var(--mld-fill-wedge)'],
  cylinder: [Cylinder, 'var(--mld-fill-cylinder)'],
  sphere: [Circle, 'var(--mld-fill-sphere)'],
  mesh: [Waypoints, 'var(--mld-fill-special)'],
  path: [Spline, 'var(--mld-fill-special)'],
  group: [Group, 'var(--mld-fill-group)'],
  locator: [Crosshair, 'var(--mld-fill-group)'],
}

/**
 * Native nested lists/disclosures: every action is a real focusable button, including on touch.
 *
 * Cada linha é um CARTÃO (a tela-modelo, 11/09/2026): o ladrilho na cor da forma com o ícone
 * branco, o nome, o tipo embaixo e o olho no fim. O olho é só INDICADOR (mostrar e esconder
 * moram em "Mais sobre a peça"): um segundo botão na linha seria um alvo pequeno ao lado do
 * grande, e o nome acessível da linha continua o de sempre ("Escolher corpo").
 */
export function SceneHierarchy({
  index,
  selected,
  onSelect,
  shapeOf,
}: {
  index: SceneIndex<ModelSceneNode>
  selected: readonly string[]
  onSelect(id: string, additive: boolean): void
  /** A forma de cada peça, que só a oficina sabe (a geometria mora fora do grafo). */
  shapeOf?(node: ModelSceneNode): SceneHierarchyShape
}) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set())
  const prefix = useId()
  const copy = COPY.scene
  function branch(ids: readonly string[], depth = 0) {
    return (
      <ul className="space-y-1.5">
        {ids.map((id) => {
          const node = index.nodes.get(id)
          if (!node) return null
          const children = index.children.get(id) ?? []
          const open = !collapsed.has(id)
          const childId = `${prefix}-${id}`
          const chosen = selected.includes(id)
          const [Icon, fill] =
            SHAPE_LOOK[shapeOf?.(node) ?? (node.kind === 'mesh' ? 'box' : node.kind)]
          const Visibility = node.hidden ? EyeOff : Eye
          return (
            <li key={id}>
              <div className="flex min-h-11 items-center gap-1">
                {children.length > 0 && (
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
                )}
                <button
                  type="button"
                  aria-label={copy.select(node.name)}
                  aria-pressed={chosen}
                  className="mld-piece flex min-h-13 min-w-0 flex-1 items-center gap-2.5 px-2 py-1.5 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mld-accent"
                  onClick={(event) =>
                    onSelect(id, event.shiftKey || event.ctrlKey || event.metaKey)
                  }
                >
                  <span
                    aria-hidden="true"
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-white"
                    style={{ background: fill }}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-extrabold text-mld-text">
                      {node.name}
                    </span>
                    <span className="block text-xs text-mld-muted">
                      {copy.nodeKind[node.kind]}
                      {node.hidden ? ` · ${copy.hiddenHint}` : ''}
                      {node.locked ? ` · ${copy.lockedHint}` : ''}
                    </span>
                  </span>
                  {node.locked && (
                    <Lock aria-hidden="true" className="size-4 shrink-0 text-mld-muted" />
                  )}
                  <Visibility aria-hidden="true" className="size-4 shrink-0 text-mld-muted" />
                </button>
              </div>
              {children.length > 0 && (
                <div
                  id={childId}
                  hidden={!open}
                  className={depth < 4 ? 'mt-1.5 ml-3 border-l border-mld-border pl-1' : 'mt-1.5'}
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
