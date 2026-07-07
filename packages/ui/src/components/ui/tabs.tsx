'use client'

import { useRef } from 'react'
import { cn } from '../../lib/cn'

export interface TabItem {
  value: string
  label: React.ReactNode
  /** Contador/badge à direita do rótulo (ex.: itens do checklist). */
  badge?: React.ReactNode
}

/**
 * Abas CONTROLADAS e leves (sem dep externa): tablist acessível com navegação
 * por setas (padrão WAI-ARIA). O conteúdo de cada aba fica com o consumidor —
 * este componente é só o seletor.
 */
export function Tabs({
  value,
  onChange,
  items,
  className,
}: {
  value: string
  onChange: (value: string) => void
  items: TabItem[]
  className?: string
}) {
  const listRef = useRef<HTMLDivElement>(null)

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const index = items.findIndex((item) => item.value === value)
    if (index === -1) return
    const delta = e.key === 'ArrowRight' ? 1 : -1
    const next = items[(index + delta + items.length) % items.length]
    if (!next) return
    onChange(next.value)
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    buttons?.[(index + delta + items.length) % items.length]?.focus()
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      onKeyDown={onKeyDown}
      className={cn(
        'flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-lg bg-muted p-1',
        className,
      )}
    >
      {items.map((item) => {
        const selected = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.value)}
            className={cn(
              'flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selected
                ? 'bg-background font-medium text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {item.label}
            {item.badge !== undefined ? (
              <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground">
                {item.badge}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
