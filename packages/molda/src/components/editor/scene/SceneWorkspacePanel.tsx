import { lazy, Suspense } from 'react'
import { Button } from '../../ui/Button'
import type { useScenePaintSheetView } from './useScenePaintSheetView'
import type { useSceneWorkshop } from './useSceneWorkshop'
import { SCENE_WORKSPACE_AREAS } from './workspaceAreaRegistry'

const Materials = lazy(() =>
  import('./SceneAppearancePanel').then((m) => ({ default: m.SceneAppearancePanel })),
)
const Sheet = lazy(() => import('./ScenePaintSheet').then((m) => ({ default: m.ScenePaintSheet })))

export function SceneWorkspacePanel({
  workshop,
  sheetView,
}: {
  workshop: ReturnType<typeof useSceneWorkshop>
  sheetView: ReturnType<typeof useScenePaintSheetView>
}) {
  const { area, primary } = workshop
  if (!area || area === 'curves' || area === 'mesh' || area === 'skin') return null
  if (area === 'sheet' || area === 'uv')
    return (
      <Suspense fallback={<p role="status">Abrindo folha…</p>}>
        <Sheet workshop={workshop} state={sheetView} />
      </Suspense>
    )
  return (
    <section
      className="mld-workspace-panel mld-scroll-y"
      aria-label={`Área ${SCENE_WORKSPACE_AREAS[area].label}`}
      data-workspace-area={area}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 tabIndex={-1} className="mld-display text-lg">
          {SCENE_WORKSPACE_AREAS[area].label}
        </h2>
        <Button
          size="compact"
          variant="ghost"
          className="mld-toolbar-action px-3 text-xs"
          onClick={() => workshop.openArea(null)}
        >
          Fechar área
        </Button>
      </div>
      <Suspense fallback={<p role="status">Abrindo ferramentas…</p>}>
        {primary?.kind !== 'mesh' ? (
          <p className="text-sm text-mld-muted">Escolha uma peça para trabalhar nesta área.</p>
        ) : (
          <Materials key={primary.id} workshop={workshop} />
        )}
      </Suspense>
    </section>
  )
}
