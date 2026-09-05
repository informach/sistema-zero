import type { JSX } from 'react'
import { COPY } from '../../core/copy'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  busy = false,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  body: string
  confirmLabel: string
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}): JSX.Element | null {
  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!busy) onClose()
      }}
      title={title}
    >
      <p className="text-base text-mld-text-soft">{body}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          {COPY.gallery.cancel}
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={busy}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  )
}
