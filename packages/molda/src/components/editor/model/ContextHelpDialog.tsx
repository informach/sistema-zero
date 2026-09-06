import type { JSX } from 'react'
import { COPY } from '../../../core/copy'
import { Dialog } from '../../ui/Dialog'
import type { ModelCommandContext, ResolvedModelCommand } from './commandRegistry'

export interface ContextHelpDialogProps {
  open: boolean
  context: ModelCommandContext
  commands: readonly ResolvedModelCommand[]
  onClose: () => void
}

export function ContextHelpDialog({
  open,
  context,
  commands,
  onClose,
}: ContextHelpDialogProps): JSX.Element {
  const copy = COPY.editor.model.help
  return (
    <Dialog open={open} onClose={onClose} title={copy.title} wide>
      <div className="flex flex-col gap-4">
        <section aria-labelledby="molda-help-context" className="mld-panel bg-mld-bg p-3">
          <h3 id="molda-help-context" className="mld-display text-base text-mld-text">
            {copy.contexts[context]}
          </h3>
          <p className="mt-1 text-sm text-mld-text-soft">{copy.gestures[context]}</p>
        </section>
        <section aria-labelledby="molda-help-actions">
          <h3 id="molda-help-actions" className="mld-display mb-2 text-base text-mld-text">
            {copy.actions}
          </h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {commands.map((command) => {
              const Icon = command.icon
              return (
                <li
                  key={command.id}
                  className="flex min-h-11 items-center gap-3 rounded-xl border-2 border-mld-border bg-mld-bg px-3 py-2"
                >
                  <Icon aria-hidden="true" className="size-5 shrink-0 text-mld-accent" />
                  <div className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-mld-text">{command.label}</span>
                    {!command.enabled && command.disabledReason ? (
                      <span className="block text-xs text-mld-muted">
                        {copy.unavailable(command.disabledReason)}
                      </span>
                    ) : command.help ? (
                      <span className="block text-xs text-mld-muted">{command.help}</span>
                    ) : null}
                  </div>
                  {command.shortcut ? (
                    <kbd
                      aria-label={`${copy.shortcut}: ${command.shortcut.display}`}
                      className="shrink-0 rounded-md border border-mld-border bg-mld-surface px-2 py-1 font-mono text-xs font-bold text-mld-text"
                    >
                      {command.shortcut.display}
                    </kbd>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </Dialog>
  )
}
