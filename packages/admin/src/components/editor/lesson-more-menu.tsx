'use client'

import { Button } from '@sistemazero/ui/button'
import { ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '@/lib/cn'

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
 */
export function LessonMoreMenu({
  items,
  label = 'Mais',
}: {
  items: readonly LessonMoreMenuItem[]
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

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
          id={menuId}
          role="menu"
          aria-label={label}
          tabIndex={-1}
          onKeyDown={onMenuKeyDown}
          className="absolute left-0 z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-popover py-1 text-popover-foreground shadow-lg sm:left-auto sm:right-0"
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
