import type { JSX, ReactNode } from 'react'
import { useEffect, useId, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import { Button, ToolButton } from '../../ui/Button'
import { isMoldaDialogOpen } from '../../ui/Dialog'
import { Layers, X } from '../../ui/icons'
import { isTypingTarget } from '../../ui/interaction'

/** A non-modal drawer on tablets; a collapsible dock on wide screens. */
export function WorkspaceInspector({
  docked,
  onBeforeClose,
  children,
}: {
  docked: boolean
  onBeforeClose(): void
  children: ReactNode
}): JSX.Element {
  const [open, setOpen] = useState(docked)
  const panelId = useId()
  const titleId = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const moveFocus = useRef(false)
  const copy = COPY.editor.model.inspector

  function close(): void {
    onBeforeClose()
    moveFocus.current = true
    setOpen(false)
  }

  useEffect(() => {
    if (!moveFocus.current) return
    moveFocus.current = false
    if (open) heading.current?.focus()
    else trigger.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open || docked) return
    const cancel = (event: KeyboardEvent) => {
      if (
        event.key !== 'Escape' ||
        event.defaultPrevented ||
        isMoldaDialogOpen() ||
        isTypingTarget(event.target)
      )
        return
      event.preventDefault()
      onBeforeClose()
      moveFocus.current = true
      setOpen(false)
    }
    const owner = trigger.current?.ownerDocument
    owner?.addEventListener('keydown', cancel)
    return () => owner?.removeEventListener('keydown', cancel)
  }, [docked, open, onBeforeClose])

  return (
    <>
      <Button
        ref={trigger}
        hidden={open}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          moveFocus.current = true
          setOpen(true)
        }}
        className="absolute top-3 right-3 z-20 min-h-11 px-3 text-sm"
      >
        <Layers aria-hidden="true" className="size-4" />
        {copy.open}
      </Button>
      <aside
        id={panelId}
        aria-labelledby={titleId}
        hidden={!open}
        className={
          docked
            ? 'flex w-68 shrink-0 flex-col border-l border-mld-border bg-mld-bg'
            : 'absolute inset-y-0 right-0 z-30 flex w-80 max-w-[calc(100%_-_3.5rem)] flex-col border-l border-mld-border bg-mld-surface shadow-lg'
        }
      >
        <div className="flex min-h-14 shrink-0 items-center justify-between gap-2 border-b border-mld-border px-3">
          <h2
            id={titleId}
            ref={heading}
            tabIndex={-1}
            className="mld-display text-base text-mld-text focus-visible:outline-2 focus-visible:outline-mld-accent"
          >
            {copy.title}
          </h2>
          <ToolButton icon={X} label={copy.close} onClick={close} />
        </div>
        <div className="mld-scroll-y flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain p-2">
          {children}
        </div>
      </aside>
    </>
  )
}
