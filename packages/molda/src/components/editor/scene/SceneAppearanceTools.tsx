import { lazy, Suspense, useState } from 'react'
import { COPY } from '../../../core/copy'
import type { useSceneWorkshop } from './useSceneWorkshop'

const SceneAppearancePanel = lazy(() =>
  import('./SceneAppearancePanel').then((module) => ({ default: module.SceneAppearancePanel })),
)

export function SceneAppearanceTools({
  workshop,
}: {
  workshop: ReturnType<typeof useSceneWorkshop>
}) {
  const [open, setOpen] = useState(false)
  return (
    <details
      className="rounded-xl border border-mld-border p-2"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="min-h-11 cursor-pointer py-3 text-sm font-bold">
        {COPY.scene.appearanceTitle}
      </summary>
      {open && (
        <Suspense fallback={<p role="status">{COPY.scene.appearanceLoading}</p>}>
          <SceneAppearancePanel workshop={workshop} />
        </Suspense>
      )}
    </details>
  )
}
