import { lazy, Suspense, useMemo } from 'react'
import { COPY } from '../../../core/copy'
import { scenePalette } from '../../../scene/composite'
import { sceneMaterialImageBase } from '../../../scene/materialImages'
import { Button } from '../../ui/Button'
import { SceneSkinWeightTools } from './SceneSkinWeightTools'
import type { useSceneWorkshop } from './useSceneWorkshop'
import { SCENE_WORKSPACE_AREAS } from './workspaceAreaRegistry'

const Uv = lazy(() => import('./SceneUvEditor').then((m) => ({ default: m.SceneUvEditor })))
const Materials = lazy(() =>
  import('./SceneAppearancePanel').then((m) => ({ default: m.SceneAppearancePanel })),
)
const Skin = lazy(() => import('./SceneSkinPanel').then((m) => ({ default: m.SceneSkinPanel })))
const Sheet = lazy(() =>
  import('./ScenePaintCanvas').then((m) => ({ default: m.ScenePaintCanvas })),
)

/** One contextual editor beside the existing viewport; commands and history keep their owner. */
export function SceneWorkspacePanel({
  workshop,
}: {
  workshop: ReturnType<typeof useSceneWorkshop>
}) {
  const { area, components, primary, paint } = workshop
  const palette = useMemo(() => scenePalette(workshop.document), [workshop.document])
  if (!area || area === 'curves' || area === 'mesh') return null
  const geometry =
    primary?.kind === 'mesh' ? workshop.index.geometries.get(primary.geometryId) : null
  const componentArea = area === 'uv' || area === 'skin'
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
        <Button className="px-2 text-xs" onClick={() => workshop.openArea(null)}>
          Fechar área
        </Button>
      </div>
      <Suspense fallback={<p role="status">Abrindo ferramentas…</p>}>
        {primary?.kind !== 'mesh' ? (
          <p className="text-sm text-mld-muted">Escolha uma peça para trabalhar nesta área.</p>
        ) : (
          <>
            {componentArea && !components.selection && (
              <Button disabled={!components.canEdit} onClick={() => workshop.openArea(area)}>
                Editar esta peça
              </Button>
            )}
            {area === 'uv' && components.uv && (
              <>
                <fieldset disabled={components.blocked} className="mb-3 flex flex-wrap gap-2">
                  <legend className="sr-only">Seleção de faces no mapa</legend>
                  <Button className="text-xs" onClick={() => components.choose('all')}>
                    {COPY.scene.faceAll}
                  </Button>
                  <Button className="text-xs" onClick={() => components.choose('none')}>
                    {COPY.scene.faceNone}
                  </Button>
                </fieldset>
                <Uv {...components.uv} />
              </>
            )}
            {area === 'materials' && <Materials key={primary.id} workshop={workshop} />}
            {area === 'skin' && (
              <>
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
            {area === 'sheet' &&
              (paint.data ? (
                <Sheet
                  image={paint.data.image}
                  palette={palette}
                  base={sceneMaterialImageBase(paint.data.material, palette, paint.data.imageKind)}
                  drawing={paint.drawing}
                  actions={paint.actions}
                  twoPoint={paint.shape !== null}
                  draft={paint.draft}
                  scope={paint.scope}
                />
              ) : (
                <p className="text-sm text-mld-muted">
                  Escolha uma camada para abrir sua folha de pintura.
                </p>
              ))}
          </>
        )}
      </Suspense>
    </section>
  )
}
