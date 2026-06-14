import type { JSX, KeyboardEvent, ReactNode } from 'react'
import { useId, useRef } from 'react'
import { cn } from '#ui'

export interface TabItem {
  id: string
  label: ReactNode
  icon?: ReactNode
}

export interface TabsProps {
  items: TabItem[]
  active: string
  onSelect: (id: string) => void
  /**
   * Conteúdo de cada aba. TODOS ficam MONTADOS e só alternam visibilidade via
   * `hidden` — preserva estado caro (xterm/jsh do Terminal, scrollback, Monaco,
   * Blockly, iframe do preview) ao trocar de aba.
   */
  renderPanel: (id: string) => ReactNode
  ariaLabel: string
  size?: 'sm' | 'md'
  className?: string
  tablistClassName?: string
}

/**
 * Abas WAI-ARIA reutilizáveis (roving tabindex + setas/Home/End). Extraído do
 * BottomPanel para servir também ao NarrowLayout. O atributo `hidden` (além da
 * classe) tira o painel inativo da árvore de acessibilidade.
 */
export function Tabs({
  items,
  active,
  onSelect,
  renderPanel,
  ariaLabel,
  size = 'sm',
  className,
  tablistClassName,
}: TabsProps): JSX.Element {
  const baseId = useId()
  const tabId = (id: string) => `${baseId}-tab-${id}`
  const panelId = (id: string) => `${baseId}-panel-${id}`
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  // Roving tabIndex: uma parada de Tab no tablist; setas movem foco E seleção.
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number | null = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % items.length
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (index - 1 + items.length) % items.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = items.length - 1
    if (next === null) return
    e.preventDefault()
    const nextId = items[next]?.id
    if (!nextId) return
    onSelect(nextId)
    tabRefs.current[nextId]?.focus()
  }

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        className={cn('flex shrink-0 overflow-x-auto border-b border-sz-border', tablistClassName)}
      >
        {items.map((item, index) => {
          const selected = active === item.id
          return (
            <button
              key={item.id}
              id={tabId(item.id)}
              ref={(el) => {
                tabRefs.current[item.id] = el
              }}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={panelId(item.id)}
              tabIndex={selected ? 0 : -1}
              onClick={() => onSelect(item.id)}
              onKeyDown={(e) => onKeyDown(e, index)}
              style={{ touchAction: 'manipulation' }}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 font-medium transition-colors',
                size === 'md' ? 'px-3.5 py-2.5 text-sm' : 'px-3 py-2 text-xs',
                selected
                  ? 'border-sz-accent text-sz-fg'
                  : 'border-transparent text-sz-fg-soft hover:text-sz-fg',
              )}
            >
              {item.icon && <span className="flex h-4 w-4 items-center justify-center">{item.icon}</span>}
              {item.label}
            </button>
          )
        })}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {items.map((item) => {
          const selected = active === item.id
          return (
            <div
              key={item.id}
              role="tabpanel"
              id={panelId(item.id)}
              aria-labelledby={tabId(item.id)}
              hidden={!selected}
              className={selected ? 'h-full' : 'hidden'}
            >
              {renderPanel(item.id)}
            </div>
          )
        })}
      </div>
    </div>
  )
}
