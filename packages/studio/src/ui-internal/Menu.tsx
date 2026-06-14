import type { JSX, KeyboardEvent, ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { cn } from './cn'

export interface MenuItem {
  id: string
  label: string
  icon?: ReactNode
  onSelect: () => void
  /** Item-interruptor: mostra estado ligado (cor de destaque + marca). */
  active?: boolean
  disabled?: boolean
}

export interface MenuSection {
  id: string
  /** Rótulo do grupo (o "agrupamento inteligente"). Omitir = sem cabeçalho. */
  label?: string
  items: MenuItem[]
}

export interface MenuProps {
  /** Conteúdo do botão que abre o menu (normalmente um ícone). */
  trigger: ReactNode
  /** aria-label/title do trigger e do menu. */
  label: string
  sections: MenuSection[]
  align?: 'left' | 'right'
  className?: string
  triggerClassName?: string
}

/**
 * Dropdown leve e INLINE (não-portaled): fica dentro do root `[data-sz-theme]`
 * do Studio, então herda o escopo de tema sem precisar de <StudioThemeScope>.
 * Fecha no clique fora e no Escape; navegação por teclado (setas/Home/End) no
 * padrão WAI-ARIA de menu.
 */
export function Menu({
  trigger,
  label,
  sections,
  align = 'right',
  className,
  triggerClassName,
}: MenuProps): JSX.Element {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])

  // Fecha ao clicar fora.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Foca o 1º item habilitado ao abrir (refs já estão setadas no commit).
  useEffect(() => {
    if (!open) return
    itemRefs.current.find((el) => el && !el.disabled)?.focus()
  }, [open])

  const close = (returnFocus = true) => {
    setOpen(false)
    if (returnFocus) triggerRef.current?.focus()
  }

  const focusables = () =>
    itemRefs.current
      .map((el, i) => ({ el, i }))
      .filter((x): x is { el: HTMLButtonElement; i: number } => Boolean(x.el) && !x.el?.disabled)

  const onItemKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const list = focusables()
    if (list.length === 0) return
    const pos = list.findIndex((x) => x.i === index)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      list[(pos + 1) % list.length]?.el.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      list[(pos - 1 + list.length) % list.length]?.el.focus()
    } else if (e.key === 'Home') {
      e.preventDefault()
      list[0]?.el.focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      list[list.length - 1]?.el.focus()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      close()
    } else if (e.key === 'Tab') {
      close(false)
    }
  }

  // Índice plano estável (mesma ordem de itemRefs) atribuído durante o render.
  let flatIndex = -1

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            setOpen(true)
          }
        }}
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-md text-sz-fg-soft transition-colors hover:bg-sz-bg hover:text-sz-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-sz-accent/60',
          open && 'bg-sz-bg text-sz-fg',
          triggerClassName,
        )}
      >
        {trigger}
      </button>
      {open && (
        <div
          role="menu"
          aria-label={label}
          className={cn(
            'absolute z-50 mt-1 min-w-56 overflow-hidden rounded-lg border border-sz-border bg-sz-panel py-1 shadow-lg',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {sections.map((section, si) => (
            <div key={section.id} role="group" aria-label={section.label}>
              {si > 0 && <div aria-hidden="true" className="my-1 h-px bg-sz-border" />}
              {section.label && (
                <div className="px-3 pb-1 pt-1.5 text-[0.65rem] font-semibold uppercase tracking-wide text-sz-fg-mute">
                  {section.label}
                </div>
              )}
              {section.items.map((item) => {
                flatIndex += 1
                const idx = flatIndex
                return (
                  <button
                    key={item.id}
                    ref={(el) => {
                      itemRefs.current[idx] = el
                    }}
                    type="button"
                    role="menuitem"
                    tabIndex={-1}
                    disabled={item.disabled}
                    aria-current={item.active || undefined}
                    onClick={() => {
                      item.onSelect()
                      close()
                    }}
                    onKeyDown={(e) => onItemKeyDown(e, idx)}
                    className={cn(
                      'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors',
                      'text-sz-fg hover:bg-sz-bg disabled:cursor-not-allowed disabled:opacity-50',
                      item.active && 'text-sz-accent',
                    )}
                  >
                    {item.icon && (
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                        {item.icon}
                      </span>
                    )}
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.active && (
                      <span className="text-sz-accent" aria-hidden="true">
                        ●
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
