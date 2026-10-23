'use client'

import { buttonVariants } from '@sistemazero/ui/button'
import { ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/cn'

export interface MoreMenuItem {
  label: string
  icon?: React.ReactNode
  /** Link (navegação do Next) OU ação; um dos dois. */
  href?: string
  onSelect?: () => void
  disabled?: boolean
  /** Por que está apagado (vai no `title`, para quem passa o mouse). */
  disabledReason?: string
}

/**
 * O menu "Mais" das telas da Turma: as ações de segunda linha num lugar só, para o cabeçalho
 * mostrar só a principal. É um `<details>` de verdade (abre com teclado e leitor de tela sem
 * script); fecha ao escolher, ao clicar fora e com Esc.
 */
export function MoreMenu({
  items,
  label = 'Mais',
  align = 'right',
}: {
  items: MoreMenuItem[]
  label?: string
  align?: 'left' | 'right'
}) {
  const ref = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    const close = (event: Event) => {
      const node = ref.current
      if (!node?.open) return
      if (event instanceof KeyboardEvent) {
        if (event.key !== 'Escape') return
        node.open = false
        node.querySelector('summary')?.focus()
        return
      }
      if (event.target instanceof Node && node.contains(event.target)) return
      node.open = false
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [])
  const closeMenu = () => {
    if (ref.current) ref.current.open = false
  }
  if (items.length === 0) return null
  return (
    <details ref={ref} className="relative">
      <summary
        className={cn(
          buttonVariants({ variant: 'outline' }),
          'min-h-11 cursor-pointer list-none gap-1.5 px-4 [&::-webkit-details-marker]:hidden',
        )}
      >
        {label}
        <ChevronDown className="size-4" aria-hidden />
      </summary>
      {/* Como o `LessonMoreMenu`: no celular o menu abre para a direita a partir do gatilho e
          nunca passa da tela; do `sm` em diante, alinhado à direita do gatilho. */}
      <div
        className={cn(
          'absolute top-full z-30 mt-2 flex w-72 max-w-[calc(100vw-2rem)] flex-col rounded-2xl border border-border bg-card p-1.5 shadow-lg',
          align === 'right' ? 'left-0 sm:left-auto sm:right-0' : 'left-0',
        )}
      >
        {items.map((item) => {
          const className = cn(
            'flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-[15px] font-medium transition-colors',
            item.disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-muted',
          )
          if (item.href && !item.disabled)
            return (
              <Link key={item.label} href={item.href} className={className} onClick={closeMenu}>
                {item.icon}
                {item.label}
              </Link>
            )
          return (
            <button
              key={item.label}
              type="button"
              className={className}
              disabled={item.disabled}
              title={item.disabled ? item.disabledReason : undefined}
              onClick={() => {
                closeMenu()
                item.onSelect?.()
              }}
            >
              {item.icon}
              {item.label}
            </button>
          )
        })}
      </div>
    </details>
  )
}
