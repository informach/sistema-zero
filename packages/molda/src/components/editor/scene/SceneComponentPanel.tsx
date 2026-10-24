import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'
import { type SceneMeasurementStep, snapSceneMeasurement } from '../../../scene/measurementStep'
import { isMoldaDialogOpen } from '../../ui/Dialog'
import { ArrowLeft, ChevronRight, type LucideIcon } from '../../ui/icons'
import { SceneHelpButton } from './SceneHelpButton'

/** Compact controls share the host's type and color tokens with the rest of the workshop. */
export function ComponentButton({
  icon: Icon,
  children,
  className = '',
  tone = 'neutral',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: LucideIcon
  tone?: 'neutral' | 'primary' | 'soft' | 'danger'
  ref?: Ref<HTMLButtonElement>
}) {
  return (
    <button
      type="button"
      className={`mld-component-button ${className}`}
      data-tone={tone}
      {...props}
    >
      {Icon && <Icon aria-hidden="true" />}
      {children}
    </button>
  )
}

export function ComponentNumberField({
  label,
  name,
  value,
  change,
  inputRef,
  measurementStep,
}: {
  label: string
  name: string
  value: number
  change(value: number): void
  inputRef?: Ref<HTMLInputElement>
  measurementStep?: SceneMeasurementStep
}) {
  return (
    <label className="mld-component-field">
      {label}
      <input
        ref={inputRef}
        name={name}
        aria-label={label}
        type="number"
        step={measurementStep ?? 0.1}
        className="min-h-11 w-full rounded-lg border border-mld-border bg-mld-bg px-3 text-mld-text focus-visible:outline-2 focus-visible:outline-mld-accent"
        value={Number.isFinite(value) ? Number(value.toPrecision(12)) : ''}
        onChange={(e) => change(e.target.value.trim() ? Number(e.target.value) : Number.NaN)}
        onBlur={(e) => {
          if (measurementStep && e.target.value.trim() && Number.isFinite(value))
            change(snapSceneMeasurement(value, measurementStep))
        }}
      />
    </label>
  )
}

export function ComponentPage({
  title,
  backLabel,
  onBack,
  onEscape = onBack,
  children,
  footer,
  help,
}: {
  title: string
  backLabel: string
  onBack(): void
  onEscape?(): void
  children: ReactNode
  footer?: ReactNode
  help?: { title: string; content: ReactNode }
}) {
  return (
    <section
      className="mld-component-panel"
      aria-label={title}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !event.defaultPrevented && !isMoldaDialogOpen()) {
          event.preventDefault()
          event.stopPropagation()
          onEscape()
        }
      }}
    >
      <button type="button" className="mld-component-back" onClick={onBack}>
        <ArrowLeft aria-hidden="true" />
        {backLabel}
      </button>
      {help ? (
        <div className="mld-component-heading">
          <h3 className="mld-display mld-component-title">{title}</h3>
          <SceneHelpButton title={help.title}>{help.content}</SceneHelpButton>
        </div>
      ) : (
        <h3 className="mld-display mld-component-title">{title}</h3>
      )}
      {children}
      {footer && <div className="mld-component-footer">{footer}</div>}
    </section>
  )
}

export function ComponentEntry({
  icon: Icon,
  label,
  hint,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon
  label: string
  hint: string
}) {
  return (
    <button type="button" className="mld-component-entry" {...props}>
      <span>
        <Icon aria-hidden="true" />
        <strong>{label}</strong>
        <ChevronRight aria-hidden="true" />
      </span>
      <span className="mld-component-description">{hint}</span>
    </button>
  )
}
