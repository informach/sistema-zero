import { useId, useState } from 'react'
import { COPY } from '../../../core/copy'
import type { ModelSceneNode } from '../../../scene/document'
import type { SceneIndex } from '../../../scene/graph'
import {
  Box,
  ChevronDown,
  ChevronRight,
  Circle,
  Crosshair,
  Cylinder,
  Eye,
  EyeOff,
  Folder,
  Lock,
  LockOpen,
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

/** O ícone de linha de cada forma e a TINTA dele (a cor da forma, que segue o tema). */
export const SHAPE_LOOK: Record<SceneHierarchyShape, [LucideIcon, string]> = {
  box: [Box, 'var(--mld-shape-box)'],
  wedge: [TriangleRight, 'var(--mld-shape-wedge)'],
  cylinder: [Cylinder, 'var(--mld-shape-cylinder)'],
  sphere: [Circle, 'var(--mld-shape-sphere)'],
  mesh: [Waypoints, 'var(--mld-shape-special)'],
  path: [Spline, 'var(--mld-shape-special)'],
  group: [Folder, 'var(--mld-shape-cylinder)'],
  locator: [Crosshair, 'var(--mld-shape-group)'],
}

/**
 * Native nested lists/disclosures: every action is a real focusable button, including on touch.
 *
 * Cada linha é a ÁRVORE dos prints (15/10/2026): o ícone de linha na cor da forma (a pasta
 * para o grupo), o nome, e o olho e o cadeado no fim. Sem o cartão alto com o tipo embaixo, que
 * fazia uma lista de seis peças rolar. No Modelar olho e cadeado são botões; nas outras abas
 * só aparecem como INDICADOR quando a peça está escondida ou travada. O nome acessível da linha
 * continua o de sempre ("Escolher corpo"), e o estado vai no `title`.
 */
export function SceneHierarchy({
  index,
  selected,
  onSelect,
  shapeOf,
  onFlag,
}: {
  index: SceneIndex<ModelSceneNode>
  selected: readonly string[]
  onSelect(id: string, additive: boolean): void
  /** A forma de cada peça, que só a oficina sabe (a geometria mora fora do grafo). */
  shapeOf?(node: ModelSceneNode): SceneHierarchyShape
  onFlag?(id: string, flag: 'hidden' | 'locked', value: boolean): void
}) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set())
  const prefix = useId()
  const copy = COPY.scene
  function branch(ids: readonly string[], depth = 0) {
    return (
      <ul className="space-y-0.5">
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
              <div className="flex items-center gap-0.5">
                {children.length > 0 && (
                  <button
                    type="button"
                    className="grid min-h-10 w-7 shrink-0 place-items-center rounded-lg text-mld-muted hover:bg-mld-bg hover:text-mld-text focus-visible:outline-2 focus-visible:outline-mld-accent"
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
                    {open ? (
                      <ChevronDown aria-hidden="true" className="size-4" />
                    ) : (
                      <ChevronRight aria-hidden="true" className="size-4" />
                    )}
                  </button>
                )}
                <button
                  type="button"
                  aria-label={copy.select(node.name)}
                  aria-pressed={chosen}
                  title={[
                    copy.nodeKind[node.kind],
                    node.hidden ? copy.hiddenHint : '',
                    node.locked ? copy.lockedHint : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  className={`mld-piece flex-1 ${node.hidden ? 'text-mld-muted' : ''}`}
                  onClick={(event) =>
                    onSelect(id, event.shiftKey || event.ctrlKey || event.metaKey)
                  }
                >
                  <Icon
                    aria-hidden="true"
                    className="size-[1.125rem] shrink-0"
                    style={{ color: fill }}
                  />
                  <span className={`min-w-0 flex-1 truncate ${node.hidden ? 'opacity-60' : ''}`}>
                    {node.name}
                  </span>
                  {!onFlag && node.locked && (
                    <Lock aria-hidden="true" className="size-4 shrink-0 text-mld-muted" />
                  )}
                  {!onFlag && node.hidden && (
                    <EyeOff aria-hidden="true" className="size-4 shrink-0 text-mld-muted" />
                  )}
                </button>
                {onFlag && (
                  <>
                    <button
                      type="button"
                      className="mld-tree-action"
                      // Nome FIXO com `aria-pressed`: "Ocultar caixa, pressionado" é a peça
                      // escondida. Trocar o nome junto do estado lia ao contrário.
                      aria-label={`Ocultar ${node.name}`}
                      title={node.hidden ? `Mostrar ${node.name}` : `Ocultar ${node.name}`}
                      aria-pressed={node.hidden}
                      onClick={() => onFlag(id, 'hidden', !node.hidden)}
                    >
                      <Visibility aria-hidden="true" className="size-4" />
                    </button>
                    <button
                      type="button"
                      className="mld-tree-action"
                      aria-label={`Travar ${node.name}`}
                      title={node.locked ? `Destravar ${node.name}` : `Travar ${node.name}`}
                      aria-pressed={node.locked}
                      onClick={() => onFlag(id, 'locked', !node.locked)}
                    >
                      {node.locked ? (
                        <Lock aria-hidden="true" className="size-4" />
                      ) : (
                        <LockOpen aria-hidden="true" className="size-4" />
                      )}
                    </button>
                  </>
                )}
              </div>
              {children.length > 0 && (
                <div
                  id={childId}
                  hidden={!open}
                  className={
                    depth < 4 ? 'mt-0.5 ml-3.5 border-l border-mld-border pl-1.5' : 'mt-0.5'
                  }
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
