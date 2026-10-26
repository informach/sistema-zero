import { useId, useRef, useState } from 'react'
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
  Torus,
  TriangleRight,
  Waypoints,
} from '../../ui/icons'
import { SceneHierarchyName } from './SceneHierarchyName'
import { useSceneHierarchyDrag } from './useSceneHierarchyDrag'
import type { SceneHierarchyOrganization } from './useSceneHierarchyOrganization'

/** A forma que cada linha mostra no ladrilho colorido: a da geometria, ou o tipo do nó. */
export type SceneHierarchyShape =
  | 'box'
  | 'wedge'
  | 'cylinder'
  | 'sphere'
  | 'torus'
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
  torus: [Torus, 'var(--mld-shape-torus)'],
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
  onSelectRange,
  shapeOf,
  onFlag,
  poseCounts,
  paintColors,
  organization,
}: {
  index: SceneIndex<ModelSceneNode>
  selected: readonly string[]
  onSelect(id: string, additive: boolean): void
  onSelectRange(ids: readonly string[]): void
  /** A forma de cada peça, que só a oficina sabe (a geometria mora fora do grafo). */
  shapeOf?(node: ModelSceneNode): SceneHierarchyShape
  onFlag?(id: string, flag: 'hidden' | 'locked', value: boolean): void
  poseCounts?: ReadonlyMap<string, number>
  paintColors?: ReadonlyMap<string, readonly string[]>
  organization?: SceneHierarchyOrganization
}) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set())
  const rangeAnchor = useRef<string | null>(null)
  const prefix = useId()
  const copy = COPY.scene
  const drag = useSceneHierarchyDrag(organization?.owner ?? index, selected, organization)
  function visibleIds(): string[] {
    const visible: string[] = []
    function visit(ids: readonly string[]) {
      for (const id of ids) {
        if (!index.nodes.has(id)) continue
        visible.push(id)
        if (!collapsed.has(id)) visit(index.children.get(id) ?? [])
      }
    }
    visit(index.roots)
    return visible
  }
  function selectRow(id: string, shift: boolean, control: boolean) {
    if (
      rangeAnchor.current !== null &&
      (selected.length !== 1 || selected[0] !== rangeAnchor.current)
    )
      rangeAnchor.current = null
    if (shift) {
      rangeAnchor.current = null
      onSelect(id, true)
      return
    }
    if (!control) {
      rangeAnchor.current = null
      onSelect(id, false)
      return
    }
    const anchor = rangeAnchor.current
    if (anchor === null) {
      rangeAnchor.current = id
      onSelectRange([id])
      return
    }
    const visible = visibleIds()
    const start = visible.indexOf(anchor)
    const end = visible.indexOf(id)
    if (start < 0 || end < 0) {
      rangeAnchor.current = id
      onSelectRange([id])
      return
    }
    rangeAnchor.current = null
    onSelectRange(visible.slice(Math.min(start, end), Math.max(start, end) + 1))
  }
  function branch(ids: readonly string[], depth = 0) {
    return (
      <ul>
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
              <fieldset
                aria-label={node.name}
                className="mld-hierarchy-row flex min-w-0 items-center gap-0.5"
                data-drop-target={drag.target === id || undefined}
                onDragOver={(event) => drag.over(event, id)}
                onDragLeave={drag.leave}
                onDrop={(event) => {
                  if (drag.drop(event, id))
                    setCollapsed((before) => {
                      const next = new Set(before)
                      next.delete(id)
                      return next
                    })
                }}
              >
                {children.length > 0 ? (
                  <button
                    type="button"
                    className="mld-hierarchy-toggle grid shrink-0 place-items-center rounded-lg text-mld-muted hover:bg-mld-bg hover:text-mld-text focus-visible:outline-2 focus-visible:outline-mld-accent"
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
                ) : (
                  <span aria-hidden="true" className="mld-hierarchy-toggle shrink-0" />
                )}
                <SceneHierarchyName
                  key={id}
                  id={id}
                  name={node.name}
                  organization={organization}
                  type="button"
                  aria-label={copy.select(node.name)}
                  aria-pressed={chosen}
                  title={[
                    copy.nodeKind[node.kind],
                    node.hidden ? copy.hiddenHint : '',
                    node.locked ? copy.lockedHint : '',
                    organization ? 'Duplo clique ou F2 para renomear' : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  className={`mld-piece flex-1 ${node.hidden ? 'text-mld-muted' : ''}`}
                  draggable={organization?.canDrag(id) ?? false}
                  onDragStart={(event) => drag.start(event, id)}
                  onDragEnd={drag.end}
                  onClick={(event) => selectRow(id, event.shiftKey, event.ctrlKey || event.metaKey)}
                >
                  <Icon
                    aria-hidden="true"
                    className="size-[1.125rem] shrink-0"
                    style={{ color: fill }}
                  />
                  <span className={`min-w-0 flex-1 truncate ${node.hidden ? 'opacity-60' : ''}`}>
                    {node.name}
                  </span>
                  {poseCounts && (
                    <span className="shrink-0 text-[11px] text-mld-muted">
                      {poseCounts.get(id) ?? 0} poses
                    </span>
                  )}
                  {paintColors?.get(id)?.length ? (
                    <span
                      role="img"
                      aria-label={`Cores de ${node.name}: ${paintColors.get(id)!.join(', ')}`}
                      className="flex shrink-0 -space-x-1"
                    >
                      {paintColors.get(id)!.map((color) => (
                        <span
                          key={color}
                          className="size-3 rounded-full border border-mld-surface"
                          style={{ background: color }}
                        />
                      ))}
                    </span>
                  ) : null}
                  {!onFlag && !poseCounts && node.locked && (
                    <Lock aria-hidden="true" className="size-4 shrink-0 text-mld-muted" />
                  )}
                  {!onFlag && !poseCounts && node.hidden && (
                    <EyeOff aria-hidden="true" className="size-4 shrink-0 text-mld-muted" />
                  )}
                </SceneHierarchyName>
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
              </fieldset>
              {children.length > 0 && (
                <div
                  id={childId}
                  hidden={!open}
                  className={depth < 4 ? 'mld-hierarchy-children' : undefined}
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
  return (
    <section aria-label={copy.hierarchy} className="mld-hierarchy">
      {drag.active && (
        <fieldset
          aria-label="Fora dos grupos"
          className="mld-hierarchy-root-drop"
          data-drop-target={drag.target === null || undefined}
          onDragOver={(event) => drag.over(event, null)}
          onDragLeave={drag.leave}
          onDrop={(event) => drag.drop(event, null)}
        >
          Soltar fora dos grupos
        </fieldset>
      )}
      {branch(index.roots)}
    </section>
  )
}
