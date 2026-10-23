'use client'

import { Button } from '@sistemazero/ui/button'
import { ChevronDown } from 'lucide-react'
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { type MenuPlacement, menuPlacementStyle, placeMenuFrom } from '@/lib/menu-placement'

/** Largura do menu (`w-72`), usada antes de ele existir para ser medido. */
const MENU_WIDTH = 288

export interface LessonMoreMenuItem {
  /** Chave estável do item (não aparece na tela). */
  id: string
  label: string
  onSelect: () => void
  disabled?: boolean
  /** Explicação curta, lida pelo leitor de tela e mostrada ao passar o mouse. */
  title?: string
  destructive?: boolean
}

/**
 * O menu "Mais" do cabeçalho do editor de aula (a sala da equipe, 23/10/2026): as ações que
 * não são o caminho principal (comparar, desfazer a restauração, tirar do ar, roteiro) saem da
 * fila de botões e ficam aqui. São botões de verdade: a seta abre e percorre, Escape fecha e
 * devolve o foco ao gatilho (também com o foco no próprio gatilho), Tab para fora e clicar fora
 * fecham. Sem item visível, o gatilho não aparece.
 *
 * O menu fica em `position: fixed` (`lib/menu-placement`): alinhado à direita do gatilho, mas
 * nunca a menos de 8px das bordas da janela; sem espaço embaixo, abre para cima; em tela baixa,
 * rola por dentro. Rolar a página ou redimensionar a janela o reposiciona.
 */
export function LessonMoreMenu({
  items,
  label = 'Mais',
}: {
  items: readonly LessonMoreMenuItem[]
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<MenuPlacement | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const menuId = useId()

  /** Recalcula a posição a partir do gatilho e do tamanho real do menu (estimado antes de existir). */
  const reposition = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    const menu = menuRef.current
    setPos(
      placeMenuFrom(trigger, {
        width: menu?.offsetWidth || MENU_WIDTH,
        height: menu?.scrollHeight ?? 0,
      }),
    )
  }, [])

  // Aberto: mede o menu de verdade (para cima se não couber embaixo) antes de pintar.
  useLayoutEffect(() => {
    if (open) reposition()
  }, [open, reposition])

  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    const onScroll = (event: Event) => {
      if (event.target instanceof Node && menuRef.current?.contains(event.target)) return
      reposition()
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', reposition)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open, reposition])

  useEffect(() => {
    // Abriu: o foco vai ao primeiro item que dá para usar (teclado e leitor de tela).
    if (open)
      rootRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus()
  }, [open])

  if (items.length === 0) return null

  function enabledIndexes() {
    return items.flatMap((item, index) => (item.disabled ? [] : [index]))
  }

  function focusAt(start: number, step: 1 | -1) {
    const enabled = enabledIndexes()
    if (enabled.length === 0) return
    const ordered = step === 1 ? enabled : [...enabled].reverse()
    const target =
      ordered.find((index) => (step === 1 ? index >= start : index <= start)) ?? ordered[0]
    if (target !== undefined) itemRefs.current[target]?.focus()
  }

  function close(returnFocus: boolean) {
    setOpen(false)
    if (returnFocus) triggerRef.current?.focus()
  }

  function onMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const current = itemRefs.current.indexOf(document.activeElement as HTMLButtonElement)
    if (event.key === 'Escape') {
      event.preventDefault()
      close(true)
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      focusAt(current + 1, 1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      focusAt(current < 0 ? items.length - 1 : current - 1, -1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      focusAt(0, 1)
    } else if (event.key === 'End') {
      event.preventDefault()
      focusAt(items.length - 1, -1)
    } else if (event.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <Button
        ref={triggerRef}
        variant="outline"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault()
            setOpen(true)
          } else if (event.key === 'Escape' && open) {
            // Com todos os itens desligados, o foco fica no gatilho: Escape fecha daqui também.
            event.preventDefault()
            close(true)
          } else if (event.key === 'Tab' && open) {
            setOpen(false)
          }
        }}
      >
        {label} <ChevronDown className="size-4" aria-hidden />
      </Button>
      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          tabIndex={-1}
          onKeyDown={onMenuKeyDown}
          style={pos ? menuPlacementStyle(pos) : undefined}
          className="fixed z-50 max-h-[calc(100dvh-1rem)] w-72 max-w-[calc(100vw-1rem)] overflow-y-auto overscroll-contain rounded-xl border border-border bg-popover py-1 text-popover-foreground shadow-lg"
        >
          {items.map((item, index) => (
            <button
              key={item.id}
              ref={(element) => {
                itemRefs.current[index] = element
              }}
              type="button"
              role="menuitem"
              tabIndex={-1}
              disabled={item.disabled}
              title={item.title}
              onClick={() => {
                close(true)
                item.onSelect()
              }}
              className={cn(
                'flex min-h-11 w-full items-center px-4 py-2 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
                item.destructive && 'text-destructive',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
