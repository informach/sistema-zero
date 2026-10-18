import { type RefObject, useRef } from 'react'
import { COPY } from '../../core/copy'
import { DeferredModule } from '../editor/DeferredEditor'
import { Dialog } from '../ui/Dialog'

const loadModelImport = () =>
  import('./GalleryModelImport').then((module) => module.GalleryModelImport)

/** Each mounted dialog owns its close guard; an older save cannot unlock a newer session. */
export function GalleryModelImportDialog({
  onClose,
  onOpen,
  returnFocusTo,
}: {
  onClose(): void
  onOpen(id: string): void
  returnFocusTo: RefObject<HTMLButtonElement | null>
}) {
  const saving = useRef(false)
  function close() {
    if (!saving.current) onClose()
  }
  return (
    <Dialog
      open
      title={COPY.gallery.importModel}
      onClose={close}
      returnFocusTo={returnFocusTo}
      wide
    >
      <DeferredModule
        load={loadModelImport}
        onBack={close}
        backLabel={COPY.gallery.cancel}
        props={{
          onClose: close,
          onOpen,
          onBusyChange: (busy: boolean) => {
            saving.current = busy
          },
        }}
      />
    </Dialog>
  )
}
