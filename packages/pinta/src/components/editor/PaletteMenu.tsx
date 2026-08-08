/**
 * Dropdown de troca de PALETA, compartilhado pelo pixel (PaletteBar) e pelo
 * vetor (VectorColorsPanel). O gatilho é o TÍTULO do painel ("Arcade ∨").
 *
 * Usa position:FIXED calculado do rect do acionador: a coluna é um scroll
 * container (overflow-y-auto) que deceparia um `absolute`, e o pacote evita
 * portais (o escopo [data-pinta-theme] mora na árvore) — o fixed escapa do clip
 * SEM sair do DOM. Fecha em clique-fora/Esc/scroll/resize/seleção.
 */
import type { JSX, MouseEvent as ReactMouseEvent, RefObject } from 'react'
import { useEffect, useRef, useState } from 'react'
import { COPY } from '../../core/copy'
import { PALETTES, type PaletteId, TRANSPARENT_INDEX } from '../../core/palette'
import { Check } from '../ui/icons'

export interface PaletteMenuAnchor {
  open: boolean
  pos: { left: number; top: number } | null
  menuRef: RefObject<HTMLDivElement | null>
  triggerRef: RefObject<HTMLButtonElement | null>
  /** Handler do gatilho: abre ancorando no rect dele (ou fecha se já aberto). */
  toggle: (event: ReactMouseEvent<HTMLButtonElement>) => void
  /** Fecha e devolve o foco ao gatilho (usado após escolher). */
  close: () => void
}

export function usePaletteMenu(): PaletteMenuAnchor {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  // Fecho: clique-fora, Esc (devolve o foco), scroll fora do menu e resize (a
  // âncora fixed fica velha — fechar é mais honesto).
  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent): void {
      const target = event.target as Node
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
        return
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const items = menuRef.current
          ? Array.from(
              menuRef.current.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'),
            )
          : []
        if (items.length === 0) return
        event.preventDefault()
        const index = items.indexOf(document.activeElement as HTMLButtonElement)
        const delta = event.key === 'ArrowDown' ? 1 : -1
        items[(index + delta + items.length) % items.length]?.focus()
      }
    }
    function onScroll(event: Event): void {
      if (menuRef.current?.contains(event.target as Node)) return
      setOpen(false)
    }
    function onResize(): void {
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  // Foco entra no item da paleta ATIVA ao abrir (fallback: o primeiro).
  useEffect(() => {
    if (!open) return
    const active = menuRef.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')
    const first = menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitemradio"]')
    ;(active ?? first)?.focus()
  }, [open])

  return {
    open,
    pos,
    menuRef,
    triggerRef,
    toggle: (event) => {
      if (open) {
        setOpen(false)
        return
      }
      const rect = event.currentTarget.getBoundingClientRect()
      triggerRef.current = event.currentTarget
      setPos({ left: rect.left, top: rect.bottom + 4 })
      setOpen(true)
    },
    close: () => {
      setOpen(false)
      triggerRef.current?.focus()
    },
  }
}

export function PaletteMenu({
  anchor,
  activeId,
  onChoose,
}: {
  anchor: PaletteMenuAnchor
  activeId: PaletteId
  onChoose: (id: PaletteId) => void
}): JSX.Element | null {
  if (!anchor.open || !anchor.pos) return null
  return (
    <div
      ref={anchor.menuRef}
      role="menu"
      aria-label={COPY.palette.switchPalette}
      style={{ position: 'fixed', left: anchor.pos.left, top: anchor.pos.top }}
      className="pin-panel z-50 flex max-h-72 w-56 flex-col gap-1 overflow-y-auto p-2"
    >
      {PALETTES.map((p) => {
        const active = activeId === p.id
        return (
          <button
            key={p.id}
            type="button"
            role="menuitemradio"
            aria-checked={active}
            onClick={() => onChoose(p.id)}
            className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl border-2 px-2 transition ${
              active ? 'border-pin-accent' : 'border-transparent hover:border-pin-border'
            }`}
          >
            <span
              aria-hidden="true"
              className="flex h-2.5 min-w-0 flex-1 overflow-hidden rounded-full"
            >
              {p.colors.map((hex, i) =>
                i === TRANSPARENT_INDEX || !hex ? null : (
                  <span
                    key={hex + String(i)}
                    className="h-full flex-1"
                    style={{ background: hex }}
                  />
                ),
              )}
            </span>
            <span className="shrink-0 text-xs font-bold text-pin-text">{p.name}</span>
            {active ? (
              <Check aria-hidden="true" className="size-4 shrink-0 text-pin-accent" />
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
