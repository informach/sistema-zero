/**
 * A lista de peças: nome, forma, cor e o selo de gêmeo. Tocar seleciona (o
 * gêmeo seleciona a fonte).
 */
import { clsx } from 'clsx'
import type { JSX } from 'react'
import { COPY } from '../../../core/copy'
import { MOLDA_LIMITS } from '../../../core/limits'
import type { MoldaModelAsset } from '../../../core/model'
import { resolvePaletteColors } from '../../../core/sanitize'
import { Panel } from '../../ui/Panel'

export function PartsPanel({
  model,
  selectedId,
  onSelect,
  className,
}: {
  model: MoldaModelAsset
  selectedId: string | null
  onSelect: (id: string) => void
  className?: string
}): JSX.Element {
  const colors = resolvePaletteColors(model)
  return (
    <Panel
      title={COPY.editor.model.parts}
      className={className}
      actions={
        <span className="px-2 text-xs font-bold text-mld-muted">
          {COPY.editor.model.partsCount(model.parts.length, MOLDA_LIMITS.maxParts)}
        </span>
      }
      bodyClassName="flex min-h-0 flex-col gap-1 overflow-y-auto p-2"
    >
      {model.parts.length === 0 ? (
        <p className="p-2 text-sm text-mld-text-soft">{COPY.editor.model.partsEmpty}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {model.parts.map((part) => {
            const sourceId = part.mirrorOf ?? part.id
            const active = selectedId === sourceId
            return (
              <li key={part.id}>
                <button
                  type="button"
                  onClick={() => onSelect(sourceId)}
                  aria-pressed={active}
                  aria-label={COPY.a11y.partItem(part.name, COPY.shapes[part.shape])}
                  className={clsx(
                    'flex min-h-11 w-full items-center gap-2 rounded-xl border-2 px-2 text-left text-sm transition',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mld-accent',
                    active
                      ? 'border-mld-accent bg-mld-accent/10'
                      : 'border-transparent hover:border-mld-border',
                    part.mirrorOf && 'opacity-70',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="size-4 shrink-0 rounded-full border border-mld-border"
                    style={{ backgroundColor: colors[part.color] ?? '#888888' }}
                  />
                  <span className="min-w-0 flex-1 truncate font-bold text-mld-text">
                    {part.name}
                  </span>
                  <span className="shrink-0 text-xs text-mld-muted">
                    {part.mirrorOf ? COPY.editor.model.twinTag : COPY.shapes[part.shape]}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
