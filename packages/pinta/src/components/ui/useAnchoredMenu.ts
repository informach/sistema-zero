import { type RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

/** Respiro mínimo entre o menu e a borda da janela. */
const VIEWPORT_MARGIN = 8

/**
 * Menu ancorado num botão, em `position: fixed`.
 *
 * ⚠️ `fixed` (e não `absolute`) de propósito: os menus do Pinta abrem dentro de
 * colunas com `overflow-y: auto` (painéis, galeria), que DECEPARIAM um absolute
 * — e o pacote evita portais, porque os tokens `pin-*` valem por herança de DOM.
 * O preço é que a âncora envelhece: por isso o menu fecha em scroll e resize.
 *
 * Extraído do dropdown de paletas do `PaletteBar` (era o único do pacote) para
 * o botão de ações dos cards da galeria reusar o MESMO comportamento: clique
 * fora fecha, Esc fecha devolvendo o foco ao gatilho, ↑/↓ andam pelos itens.
 */
export interface AnchoredMenu<T extends HTMLElement = HTMLButtonElement> {
  open: boolean
  /** Posição da âncora, em coordenadas de viewport (`position: fixed`). */
  position: { left: number; top: number } | null
  triggerRef: RefObject<T | null>
  menuRef: RefObject<HTMLDivElement | null>
  /** Handler do gatilho: mede o botão e abre/fecha. */
  toggle: (event: { currentTarget: HTMLElement }) => void
  close: () => void
}

export function useAnchoredMenu<T extends HTMLElement = HTMLButtonElement>(options?: {
  /** Seletor dos itens navegáveis por seta. Default: `[role="menuitem"]`. */
  itemSelector?: string
  /** Alinha o menu pela borda DIREITA do gatilho (default: esquerda). */
  align?: 'start' | 'end'
}): AnchoredMenu<T> {
  const itemSelector = options?.itemSelector ?? '[role="menuitem"]'
  const align = options?.align ?? 'start'
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)
  const anchorRef = useRef<{ left: number; right: number; top: number } | null>(null)
  const triggerRef = useRef<T | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const close = useCallback(() => setOpen(false), [])

  const toggle = useCallback((event: { currentTarget: HTMLElement }) => {
    const rect = event.currentTarget.getBoundingClientRect()
    anchorRef.current = { left: rect.left, right: rect.right, top: rect.bottom + 4 }
    // Posição provisória: o alinhamento final precisa da LARGURA do menu, que
    // só existe depois de montado (ver o layout effect abaixo).
    setPosition({ left: rect.left, top: rect.bottom + 4 })
    setOpen((current) => !current)
  }, [])

  // Trava o menu dentro da janela DEPOIS de medi-lo — sem isto, um menu alinhado
  // à direita num gatilho da primeira coluna sai pela borda esquerda da tela
  // (visto no QA da galeria, onde o card mede ~94px).
  useLayoutEffect(() => {
    if (!open) return
    const menu = menuRef.current
    const anchor = anchorRef.current
    if (!menu || !anchor) return
    const { width, height } = menu.getBoundingClientRect()
    const desired = align === 'end' ? anchor.right - width : anchor.left
    const maxLeft = Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN)
    const left = Math.min(Math.max(desired, VIEWPORT_MARGIN), maxLeft)
    // Sem espaço embaixo? Abre para CIMA do gatilho.
    const overflowsBottom = anchor.top + height > window.innerHeight - VIEWPORT_MARGIN
    const top = overflowsBottom ? Math.max(VIEWPORT_MARGIN, anchor.top - height - 8) : anchor.top
    setPosition((current) =>
      current && current.left === left && current.top === top ? current : { left, top },
    )
  }, [open, align])

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
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
      const items = menuRef.current
        ? Array.from(menuRef.current.querySelectorAll<HTMLElement>(itemSelector))
        : []
      if (items.length === 0) return
      event.preventDefault()
      const index = items.indexOf(document.activeElement as HTMLElement)
      const delta = event.key === 'ArrowDown' ? 1 : -1
      items[(index + delta + items.length) % items.length]?.focus()
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
  }, [open, itemSelector])

  // O foco entra no menu ao abrir (teclado não fica órfão atrás do gatilho).
  useEffect(() => {
    if (!open) return
    menuRef.current?.querySelector<HTMLElement>(itemSelector)?.focus()
  }, [open, itemSelector])

  return { open, position, triggerRef, menuRef, toggle, close }
}
