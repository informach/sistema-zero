import type { JSX } from 'react'
import { COPY } from '../../core/copy'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  body: string
  confirmLabel: string
  onConfirm: () => void
  onClose: () => void
}): JSX.Element | null {
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <p className="text-base text-mld-text-soft">{body}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          {COPY.gallery.cancel}
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  )
}
