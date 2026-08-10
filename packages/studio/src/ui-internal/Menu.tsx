import type { JSX, KeyboardEvent, ReactNode } from 'react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { StudioThemeScope } from '../studio/theme'
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

interface PanelPos {
  top: number
  left?: number
  right?: number
}

/**
 * Dropdown PORTALADO para `document.body` (via <StudioThemeScope>, que reaplica o
 * tema fora do root). Portal — não `absolute` no fluxo — porque o painel precisa
 * ficar ACIMA do `<iframe>` do preview: um iframe cria stacking context próprio e
 * vencia um menu posicionado dentro da Topbar, por mais alto que fosse o z-index.
 * Fecha no clique fora (backdrop) e no Escape; navegação por teclado (setas/Home/
 * End) no padrão WAI-ARIA de menu.
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
  const [pos, setPos] = useState<PanelPos | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])

  // Ancora o painel (fixed) no trigger; recalcula em resize/scroll. Alinha pela
  // borda escolhida via `right`/`left` (sem depender da largura medida do painel).
  useLayoutEffect(() => {
    if (!open) {
      setPos(null)
      return
    }
    const update = () => {
      const r = triggerRef.current?.getBoundingClientRect()
      if (!r) return
      const top = r.bottom + 4
      setPos(
        align === 'right'
          ? { top, right: Math.max(8, window.innerWidth - r.right) }
          : { top, left: Math.max(8, r.left) },
      )
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open, align])

  // Foca o 1º item habilitado ao abrir (após posicionar = painel já no DOM).
  useEffect(() => {
    if (!open || !pos) return
    itemRefs.current.find((el) => el && !el.disabled)?.focus()
  }, [open, pos])

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
    <div className={cn('relative', className)}>
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
          'sz-touch-target inline-flex h-9 w-9 items-center justify-center rounded-md text-sz-fg-soft transition-colors hover:bg-sz-bg hover:text-sz-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-sz-accent/60',
          open && 'bg-sz-bg text-sz-fg',
          triggerClassName,
        )}
      >
        {trigger}
      </button>
      {open &&
        pos &&
        createPortal(
          <StudioThemeScope>
            <button
              type="button"
              aria-hidden="true"
              tabIndex={-1}
              className="fixed inset-0 z-40 cursor-default bg-transparent"
              onMouseDown={(e) => {
                e.preventDefault()
                close()
              }}
            />
            <div
              role="menu"
              aria-label={label}
              style={{ top: pos.top, left: pos.left, right: pos.right }}
              className="fixed z-50 max-h-[min(70vh,32rem)] min-w-56 overflow-auto rounded-lg border border-sz-border bg-sz-panel py-1 shadow-lg"
            >
              {sections.map((section, si) => (
                <fieldset
                  key={section.id}
                  aria-label={section.label}
                  className="m-0 min-w-0 border-0 p-0"
                >
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
                          'sz-touch-target flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors',
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
                </fieldset>
              ))}
            </div>
          </StudioThemeScope>,
          document.body,
        )}
    </div>
  )
}
