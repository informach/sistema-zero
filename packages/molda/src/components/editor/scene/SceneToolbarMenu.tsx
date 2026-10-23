import { type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../../ui/Button'
import { MoreHorizontal } from '../../ui/icons'

/** Portaled inside the Molda theme: menus neither stretch a toolbar nor get clipped by the stage. */
export function SceneToolbarMenu({
  label = 'Opções',
  iconOnly = false,
  children,
}: {
  label?: string
  iconOnly?: boolean
  children: ReactNode
}) {
  const id = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLFieldSetElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const host = trigger.current?.closest<HTMLElement>('[data-molda-theme]')
  useLayoutEffect(() => {
    const element = menu.current
    if (!position || !element) return
    const constrain = () => {
      const height = element.getBoundingClientRect().height
      const top = Math.max(8, Math.min(position.top, window.innerHeight - height - 8))
      if (top !== position.top) setPosition({ ...position, top })
    }
    constrain()
    const observer = new ResizeObserver(constrain)
    observer.observe(element)
    return () => observer.disconnect()
  }, [position])
  function close(focus = false) {
    setPosition(null)
    if (focus) trigger.current?.focus()
  }
  useEffect(() => {
    if (!position) return
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !menu.current?.contains(event.target) &&
        !trigger.current?.contains(event.target)
      )
        setPosition(null)
    }
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      setPosition(null)
      trigger.current?.focus()
    }
    const reposition = () => setPosition(null)
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', onEscape, true)
    window.addEventListener('resize', reposition)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', onEscape, true)
      window.removeEventListener('resize', reposition)
    }
  }, [position])
  useEffect(() => {
    if (position) menu.current?.querySelector<HTMLElement>('button, input, summary')?.focus()
  }, [position])
  return (
    <>
      <Button
        size="compact"
        ref={trigger}
        data-toolbar-menu
        variant="ghost"
        className="mld-toolbar-action px-3 text-xs"
        aria-expanded={!!position}
        aria-controls={position ? id : undefined}
        onClick={() => {
          if (position) {
            close()
            return
          }
          const rect = trigger.current?.getBoundingClientRect()
          if (rect)
            setPosition({
              top: Math.min(rect.bottom + 4, window.innerHeight - 240),
              left: Math.max(8, Math.min(rect.right - 260, window.innerWidth - 268)),
            })
        }}
      >
        <MoreHorizontal className="size-4" aria-hidden="true" />
        <span className={iconOnly ? 'sr-only' : undefined}>{label}</span>
      </Button>
      {position &&
        host &&
        createPortal(
          <fieldset
            ref={menu}
            id={id}
            aria-label={label}
            className="mld-toolbar-menu mld-scroll-y"
            style={position}
            onKeyDown={(event) => {
              if (!(event.target instanceof HTMLButtonElement)) return
              if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
              const targets = [
                ...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
              ].filter((target) => target.getClientRects().length > 0)
              const index =
                document.activeElement instanceof HTMLButtonElement
                  ? targets.indexOf(document.activeElement)
                  : -1
              event.preventDefault()
              targets[
                (index + (event.key === 'ArrowDown' ? 1 : targets.length - 1)) % targets.length
              ]?.focus()
            }}
            onClick={(event) => {
              if (
                event.target instanceof Element &&
                event.target.closest('button[data-close-menu]')
              )
                close(true)
            }}
            onBlur={(event) => {
              if (
                event.relatedTarget instanceof Node &&
                !event.currentTarget.contains(event.relatedTarget) &&
                !trigger.current?.contains(event.relatedTarget)
              )
                close()
            }}
          >
            {children}
          </fieldset>,
          host,
        )}
    </>
  )
}
