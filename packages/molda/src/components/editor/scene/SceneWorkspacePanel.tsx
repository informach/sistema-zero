import { lazy, Suspense } from 'react'
import { Button } from '../../ui/Button'
import { SceneSkinWeightTools } from './SceneSkinWeightTools'
import type { useScenePaintSheetView } from './useScenePaintSheetView'
import type { useSceneWorkshop } from './useSceneWorkshop'
import { SCENE_WORKSPACE_AREAS } from './workspaceAreaRegistry'

const Materials = lazy(() =>
  import('./SceneAppearancePanel').then((m) => ({ default: m.SceneAppearancePanel })),
)
const Skin = lazy(() => import('./SceneSkinPanel').then((m) => ({ default: m.SceneSkinPanel })))
const Sheet = lazy(() => import('./ScenePaintSheet').then((m) => ({ default: m.ScenePaintSheet })))

export function SceneWorkspacePanel({
  workshop,
  sheetView,
}: {
  workshop: ReturnType<typeof useSceneWorkshop>
  sheetView: ReturnType<typeof useScenePaintSheetView>
}) {
  const { area, components, primary } = workshop
  if (!area || area === 'curves' || area === 'mesh') return null
  if (area === 'sheet' || area === 'uv')
    return (
      <Suspense fallback={<p role="status">Abrindo folha…</p>}>
        <Sheet workshop={workshop} state={sheetView} />
      </Suspense>
    )
  const geometry =
    primary?.kind === 'mesh' ? workshop.index.geometries.get(primary.geometryId) : null
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
        ) : area === 'materials' ? (
          <Materials key={primary.id} workshop={workshop} />
        ) : (
          <>
            {!components.selection && (
              <Button
                size="compact"
                disabled={!components.canEdit}
                onClick={() => workshop.openArea(area)}
              >
                Editar esta peça
              </Button>
            )}
            {geometry?.kind === 'mesh' ? (
              <Skin
                key={primary.id}
                editor={workshop.editor}
                nodeId={primary.id}
                onClose={() => workshop.openArea(null)}
              />
            ) : (
              <p className="text-sm text-mld-muted">
                Converta a forma em malha para ligar ossos a seus pontos.
              </p>
            )}
            {components.weights && <SceneSkinWeightTools {...components.weights} />}
          </>
        )}
      </Suspense>
    </section>
  )
}
