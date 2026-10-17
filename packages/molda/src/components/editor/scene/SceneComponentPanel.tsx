import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'
import { ArrowLeft, ChevronRight, type LucideIcon } from '../../ui/icons'

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

export function ComponentPage({
  title,
  description,
  backLabel,
  onBack,
  onEscape = onBack,
  children,
  footer,
}: {
  title: string
  description?: string
  backLabel: string
  onBack(): void
  onEscape?(): void
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <section
      className="mld-component-panel"
      aria-label={title}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !event.defaultPrevented) {
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
      <h3 className="mld-display mld-component-title">{title}</h3>
      {description && <p className="mld-component-description">{description}</p>}
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
