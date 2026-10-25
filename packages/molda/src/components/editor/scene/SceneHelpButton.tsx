import { type ReactNode, useRef, useState } from 'react'
import { Dialog } from '../../ui/Dialog'
import { CircleHelp } from '../../ui/icons'

/** Keep optional instructions close to a control without taking up panel space. */
export function SceneHelpButton({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="mld-component-help shrink-0"
        aria-label={title}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <CircleHelp aria-hidden="true" />
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={title} returnFocusTo={trigger}>
        <div className="space-y-3 text-sm text-mld-text">{children}</div>
      </Dialog>
    </>
  )
}
