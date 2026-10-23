'use client'

import { ChevronDown } from 'lucide-react'
import Link from 'next/link'
import {
  Fragment,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { cn } from '@/lib/cn'
import {
  type MenuPlacement,
  menuPlacementStyle,
  placeMenuFrom,
  triggerOutOfView,
} from '@/lib/menu-placement'

/**
 * Um item do menu "Ações" de uma conta. `href` vira link; senão é botão. `separatorBefore`
 * desenha a linha que separa a exclusão do resto.
 */
export interface RowActionItem {
  key: string
  label: string
  icon?: ReactNode
  href?: string
  onSelect?: () => void
  disabled?: boolean
  destructive?: boolean
  separatorBefore?: boolean
}

/** Largura do menu (`w-64`), usada antes de ele existir para ser medido. */
const MENU_WIDTH = 256

/**
 * O botão "Ações" de cada linha da lista de contas (a sala da equipe, 23/10/2026): um menu
 * com rótulos escritos, no lugar de seis ícones soltos.
 *
 * ⚠ O menu usa `position: fixed` calculado a partir do botão: a tabela mora num
 * `overflow-x-auto`, que cortaria um menu absoluto na última linha. Sem espaço embaixo, ele
 * abre para cima; na horizontal, fica a 8px das bordas da janela (`lib/menu-placement`).
 * Rolar a PÁGINA (ou redimensionar a janela) reposiciona o menu junto do botão, e fecha se o
 * botão sair da tela, para cima, para baixo ou para os lados; rolar dentro do próprio menu
 * não fecha nada.
 *
 * Teclado: Enter, Espaço e seta para baixo abrem e focam o primeiro item; seta para cima abre
 * e foca o último; as setas sobem e descem; Home/End vão às pontas; Escape fecha e devolve o
 * foco ao botão; Tab fecha e segue o fluxo normal.
 */
export function RowActionsMenu({ label, items }: { label: string; items: RowActionItem[] }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<MenuPlacement | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  /** Qual ponta do menu recebe o foco quando ele abre. */
  const focusEdge = useRef<'first' | 'last'>('first')
  const menuId = useId()

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false)
    if (returnFocus) buttonRef.current?.focus()
  }, [])

  /** Recalcula a posição a partir do botão e da altura real do menu (0 antes de existir). */
  const reposition = useCallback(() => {
    const button = buttonRef.current
    if (!button) return
    const menu = menuRef.current
    setPos(
      placeMenuFrom(button, {
        width: menu?.offsetWidth || MENU_WIDTH,
        height: menu?.scrollHeight ?? 0,
      }),
    )
  }, [])

  function openMenu(edge: 'first' | 'last') {
    focusEdge.current = edge
    reposition()
    setOpen(true)
  }

  function toggle() {
    if (open) {
      close(false)
      return
    }
    openMenu('first')
  }

  function onTriggerKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    // Enter e Espaço chegam como clique (`toggle`); as setas abrem já na ponta certa.
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    openMenu(e.key === 'ArrowDown' ? 'first' : 'last')
  }

  // Aberto: mede o menu de verdade (para cima se não couber embaixo) antes de pintar.
  useLayoutEffect(() => {
    if (open) reposition()
  }, [open, reposition])

  // Foca o primeiro item ao abrir (ou o último, quando abriu pela seta para cima).
  useEffect(() => {
    if (!open) return
    const nodes = menuRef.current?.querySelectorAll<HTMLElement>(
      '[role="menuitem"]:not([disabled])',
    )
    if (!nodes || nodes.length === 0) return
    const target = focusEdge.current === 'last' ? nodes[nodes.length - 1] : nodes[0]
    target?.focus()
  }, [open])

  // Clique fora fecha. Rolar a página ou redimensionar reposiciona junto do botão (e fecha se
  // o botão saiu da tela, em qualquer direção); a rolagem dentro do menu não conta.
  useEffect(() => {
    if (!open) return
    function onPointer(e: PointerEvent) {
      const target = e.target as Node
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return
      close(false)
    }
    function onScroll(e: Event) {
      if (e.target instanceof Node && menuRef.current?.contains(e.target)) return
      const rect = buttonRef.current?.getBoundingClientRect()
      if (
        !rect ||
        triggerOutOfView(rect, { width: window.innerWidth, height: window.innerHeight })
      ) {
        close(false)
        return
      }
      reposition()
    }
    document.addEventListener('pointerdown', onPointer)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', reposition)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open, close, reposition])

  function onMenuKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const nodes = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? [],
    )
    const index = nodes.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'Escape') {
      e.preventDefault()
      close(true)
    } else if (e.key === 'Tab') {
      close(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      nodes[(index + 1) % nodes.length]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      nodes[(index - 1 + nodes.length) % nodes.length]?.focus()
    } else if (e.key === 'Home') {
      e.preventDefault()
      nodes[0]?.focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      nodes[nodes.length - 1]?.focus()
    }
  }

  const itemClass = (item: RowActionItem) =>
    cn(
      'flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[15px] outline-none',
      'hover:bg-muted focus-visible:bg-muted disabled:pointer-events-none disabled:opacity-50',
      item.destructive ? 'text-destructive' : 'text-foreground',
    )

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        onClick={toggle}
        onKeyDown={onTriggerKeyDown}
        className="inline-flex h-10 items-center gap-1 rounded-full border border-border bg-card px-4 text-sm font-bold hover:bg-muted"
      >
        Ações <ChevronDown className="size-4" aria-hidden />
      </button>
      {open && pos ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          tabIndex={-1}
          onKeyDown={onMenuKeyDown}
          style={menuPlacementStyle(pos)}
          className="fixed z-50 w-64 overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card p-1.5 text-left shadow-lg"
        >
          {items.map((item) => (
            <Fragment key={item.key}>
              {item.separatorBefore ? <hr className="my-1.5 border-border" /> : null}
              {item.href ? (
                <Link
                  href={item.href}
                  role="menuitem"
                  className={itemClass(item)}
                  onClick={() => close(false)}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  className={itemClass(item)}
                  onClick={() => {
                    close(false)
                    item.onSelect?.()
                  }}
                >
                  {item.icon}
                  {item.label}
                </button>
              )}
            </Fragment>
          ))}
        </div>
      ) : null}
    </>
  )
}
