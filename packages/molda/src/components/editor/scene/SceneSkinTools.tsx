import { lazy, Suspense, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import { Button } from '../../ui/Button'
import { Dialog } from '../../ui/Dialog'
import type { useSceneWorkshop } from './useSceneWorkshop'

const SceneSkinPanel = lazy(() =>
  import('./SceneSkinPanel').then((module) => ({ default: module.SceneSkinPanel })),
)

export function SceneSkinTools({ workshop }: { workshop: ReturnType<typeof useSceneWorkshop> }) {
  const [open, setOpen] = useState(false),
    trigger = useRef<HTMLButtonElement>(null),
    copy = COPY.scene.skinBinding,
    nodeId = workshop.primary?.id
  if (!nodeId) return null
  return (
    <>
      <Button
        ref={trigger}
        className="w-full text-sm"
        onClick={() => {
          workshop.cancelGesture()
          workshop.paint.close()
          workshop.components.close()
          setOpen(true)
        }}
      >
        {copy.open}
      </Button>
      <Dialog open={open} title={copy.title} onClose={() => setOpen(false)} returnFocusTo={trigger}>
        {open && (
          <Suspense fallback={<p role="status">{COPY.scene.appearanceLoading}</p>}>
            <SceneSkinPanel
              editor={workshop.editor}
              nodeId={nodeId}
              onClose={() => setOpen(false)}
            />
          </Suspense>
        )}
      </Dialog>
    </>
  )
}
