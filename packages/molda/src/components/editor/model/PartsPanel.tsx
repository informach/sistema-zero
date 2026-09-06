/**
 * A lista de peças: nome, forma, cor, os selos (gêmeo, trancada, escondida) e,
 * por peça FONTE, o cadeado (trancar: o toque no palco não a escolhe nem a
 * arrasta) e o olho (esconder no palco; ela segue no modelo e no export).
 * Tocar seleciona (o gêmeo seleciona a fonte); com "Somar à seleção" ligado, ou
 * com Shift/Ctrl, o toque SOMA a peça à seleção (ou a tira).
 */
import { clsx } from 'clsx'
import type { JSX } from 'react'
import { COPY } from '../../../core/copy'
import { MOLDA_LIMITS } from '../../../core/limits'
import type { MoldaModelAsset } from '../../../core/model'
import { resolvePaletteColors } from '../../../core/sanitize'
import { IconButton } from '../../ui/Button'
import { Eye, EyeOff, Lock, LockOpen } from '../../ui/icons'
import { Panel } from '../../ui/Panel'

export function PartsPanel({
  model,
  selectedId,
  extraIds = [],
  additive = false,
  onSelect,
  onToggle,
  onLock,
  onHide,
  className,
}: {
  model: MoldaModelAsset
  selectedId: string | null
  /** As peças SOMADAS à principal (seleção múltipla). */
  extraIds?: readonly string[]
  /** "Somar à seleção" ligado: o toque soma em vez de trocar. */
  additive?: boolean
  onSelect: (id: string) => void
  onToggle?: (id: string) => void
  onLock?: (id: string) => void
  onHide?: (id: string) => void
  className?: string
}): JSX.Element {
  const colors = resolvePaletteColors(model)
  const selected = new Set<string | null>([selectedId, ...extraIds])
  const copy = COPY.editor.model
  return (
    <Panel
      title={copy.parts}
      className={className}
      actions={
        <span className="px-2 text-xs font-bold text-mld-muted">
          {copy.partsCount(model.parts.length, MOLDA_LIMITS.maxParts)}
        </span>
      }
      bodyClassName="flex min-h-0 flex-col gap-1 overflow-y-auto p-2"
    >
      {model.parts.length === 0 ? (
        <p className="p-2 text-sm text-mld-text-soft">{copy.partsEmpty}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {model.parts.map((part) => {
            const sourceId = part.mirrorOf ?? part.id
            const active = selected.has(sourceId)
            const tags = [
              part.mirrorOf ? copy.twinTag : COPY.shapes[part.shape],
              !part.mirrorOf && part.locked ? copy.lockedTag : null,
              !part.mirrorOf && part.hidden ? copy.hiddenTag : null,
            ]
              .filter(Boolean)
              .join(' · ')
            return (
              <li key={part.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(event) => {
                    const sum =
                      onToggle && (additive || event.shiftKey || event.ctrlKey || event.metaKey)
                    if (sum) onToggle(sourceId)
                    else onSelect(sourceId)
                  }}
                  aria-pressed={active}
                  aria-label={COPY.a11y.partItem(part.name, COPY.shapes[part.shape])}
                  className={clsx(
                    'flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border-2 px-2 text-left text-sm transition',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mld-accent',
                    active
                      ? 'border-mld-accent bg-mld-accent/10'
                      : 'border-transparent hover:border-mld-border',
                    (part.mirrorOf || part.hidden) && 'opacity-70',
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
                  <span className="shrink-0 text-xs text-mld-muted">{tags}</span>
                </button>
                {!part.mirrorOf && onLock && onHide ? (
                  <>
                    <IconButton
                      aria-label={COPY.a11y.partLock(part.name, Boolean(part.locked))}
                      aria-pressed={Boolean(part.locked)}
                      active={Boolean(part.locked)}
                      onClick={() => onLock(part.id)}
                      className="min-h-11 min-w-11"
                    >
                      {part.locked ? (
                        <Lock aria-hidden="true" className="size-4" />
                      ) : (
                        <LockOpen aria-hidden="true" className="size-4" />
                      )}
                    </IconButton>
                    <IconButton
                      aria-label={COPY.a11y.partHide(part.name, Boolean(part.hidden))}
                      aria-pressed={Boolean(part.hidden)}
                      active={Boolean(part.hidden)}
                      onClick={() => onHide(part.id)}
                      className="min-h-11 min-w-11"
                    >
                      {part.hidden ? (
                        <EyeOff aria-hidden="true" className="size-4" />
                      ) : (
                        <Eye aria-hidden="true" className="size-4" />
                      )}
                    </IconButton>
                  </>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
