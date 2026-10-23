'use client'

import { buttonVariants } from '@sistemazero/ui/button'
import { ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { type MenuPlacement, menuPlacementStyle, placeMenuFrom } from '@/lib/menu-placement'

/** Largura do menu (`w-72`), usada antes de ele existir para ser medido. */
const MENU_WIDTH = 288

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
 * mostrar só a principal. É um `<details>` de verdade (abre com teclado e leitor de tela); fecha
 * ao escolher, ao clicar fora e com Esc.
 *
 * O painel fica em `position: fixed` (`lib/menu-placement`): alinhado ao gatilho pelo lado de
 * `align`, mas nunca a menos de 8px das bordas da janela; sem espaço embaixo, abre para cima e
 * rola por dentro. Rolar a página ou redimensionar a janela o reposiciona.
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
  const summaryRef = useRef<HTMLElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<MenuPlacement | null>(null)

  /** Recalcula a posição a partir do gatilho e do tamanho real do painel. */
  const reposition = useCallback(() => {
    const summary = summaryRef.current
    if (!summary) return
    const panel = panelRef.current
    setPos(
      placeMenuFrom(
        summary,
        { width: panel?.offsetWidth || MENU_WIDTH, height: panel?.scrollHeight ?? 0 },
        align === 'right' ? 'end' : 'start',
      ),
    )
  }, [align])

  // Aberto: mede o painel de verdade antes de pintar.
  useLayoutEffect(() => {
    if (open) reposition()
  }, [open, reposition])

  useEffect(() => {
    if (!open) return
    const close = (event: Event) => {
      const node = ref.current
      if (!node) return
      if (event instanceof KeyboardEvent) {
        if (event.key !== 'Escape') return
        setOpen(false)
        summaryRef.current?.focus()
        return
      }
      if (event.target instanceof Node && node.contains(event.target)) return
      setOpen(false)
    }
    const onScroll = (event: Event) => {
      if (event.target instanceof Node && panelRef.current?.contains(event.target)) return
      reposition()
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', reposition)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open, reposition])
  const closeMenu = () => setOpen(false)
  if (items.length === 0) return null
  return (
    <details ref={ref} open={open} className="relative">
      <summary
        ref={summaryRef}
        onClick={(event) => {
          // O estado manda no `open` (a posição é calculada antes de o painel aparecer); Enter e
          // Espaço no `summary` também chegam aqui como clique.
          event.preventDefault()
          setOpen((value) => !value)
        }}
        className={cn(
          buttonVariants({ variant: 'outline' }),
          'min-h-11 cursor-pointer list-none gap-1.5 px-4 [&::-webkit-details-marker]:hidden',
        )}
      >
        {label}
        <ChevronDown className="size-4" aria-hidden />
      </summary>
      <div
        ref={panelRef}
        style={pos ? menuPlacementStyle(pos) : undefined}
        className="fixed z-30 flex max-h-[calc(100dvh-1rem)] w-72 max-w-[calc(100vw-1rem)] flex-col overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card p-1.5 shadow-lg"
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
