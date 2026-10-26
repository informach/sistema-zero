import { useMemo, useState } from 'react'
import { scenePalette } from '../../../scene/composite'
import { SCENE_MATERIAL_IMAGE_FIELDS, sceneMaterialImageBase } from '../../../scene/materialImages'
import { meshUvBounds } from '../../../scene/meshUv'
import { meshUvTextureLayout } from '../../../scene/meshUvLayout'
import { scenePaintFaceIds } from '../../../scene/paintFaceSelection'
import { sceneGeometryMesh } from '../../../scene/parametricGeometry'
import { useMoldaToolAccess } from '../../toolAccess'
import { Button, ToolButton } from '../../ui/Button'
import { Grid3x3, Maximize2, Minimize2, X } from '../../ui/icons'
import { ScenePaintCanvas } from './ScenePaintCanvas'
import { SceneTextureGrid } from './SceneTextureGrid'
import { SceneTextureViewport } from './SceneTextureViewport'
import { SceneToolbarMenu } from './SceneToolbarMenu'
import { SceneUvCanvas } from './SceneUvCanvas'
import { SceneUvEditor } from './SceneUvEditor'
import { SceneUvOutlines } from './SceneUvOutlines'
import type { useScenePaintSheetView } from './useScenePaintSheetView'
import type { useSceneWorkshop } from './useSceneWorkshop'

export function ScenePaintSheet({
  workshop,
  state,
}: {
  workshop: ReturnType<typeof useSceneWorkshop>
  state: ReturnType<typeof useScenePaintSheetView>
}) {
  const { can } = useMoldaToolAccess()
  const { primary, paint, components } = workshop
  const adjusting = workshop.area === 'uv'
  const [cancelKey, setCancelKey] = useState(0)
  const palette = useMemo(() => scenePalette(workshop.document), [workshop.document])
  const geometry =
    primary?.kind === 'mesh' ? workshop.index.geometries.get(primary.geometryId) : undefined
  const mesh = useMemo(() => (geometry ? sceneGeometryMesh(geometry) : null), [geometry])
  const uv = components.uv
  const texture = adjusting
    ? uv?.texture
    : paint.data
      ? {
          image: paint.data.image,
          palette,
          base: sceneMaterialImageBase(paint.data.material, palette, paint.data.imageKind),
        }
      : undefined
  const image = texture?.image ?? { width: 64, height: 64 }
  const imageKey = JSON.stringify([
    workshop.area,
    primary?.id,
    texture?.image.id,
    image.width,
    image.height,
  ])
  const paintIds = useMemo(
    () =>
      geometry && workshop.paintFaceId ? scenePaintFaceIds(geometry, workshop.paintFaceId) : [],
    [geometry, workshop.paintFaceId],
  )
  const bounds =
    adjusting && uv?.ids.length
      ? meshUvBounds(uv.mesh, uv.ids)
      : mesh && paintIds.length
        ? meshUvBounds(mesh, paintIds)
        : undefined
  const uvMesh = uv?.mesh
  const uvVisibleIds = uv?.visibleIds
  const contentBounds = useMemo(() => {
    if (!adjusting || !uvMesh) return undefined
    const ids = uvVisibleIds ?? Object.keys(uvMesh.faces)
    return ids.length ? meshUvBounds(uvMesh, ids) : undefined
  }, [adjusting, uvMesh, uvVisibleIds])
  function cancel() {
    paint.cancel()
    setCancelKey((key) => key + 1)
  }
  function resizeFromPointer(target: HTMLElement, clientX: number) {
    const rect = target.parentElement?.getBoundingClientRect()
    if (!rect?.width) return
    state.setWidth(Math.max(30, Math.min(65, ((clientX - rect.left) / rect.width) * 100)))
  }
  const materials = workshop.document.materials
  const materialsById = useMemo(
    () => new Map(materials.map((material) => [material.id, material])),
    [materials],
  )
  const paintImageId = paint.data?.image.id
  const paintImageKind = paint.data?.imageKind ?? 'color'
  const paintLayout = useMemo(
    () =>
      mesh && paintImageId
        ? meshUvTextureLayout(
            mesh,
            Object.keys(mesh.faces).filter((id) => {
              const materialId =
                mesh.faces[id]?.materialId ??
                (primary?.kind === 'mesh' ? primary.materialId : undefined)
              return (
                materialId &&
                materialsById.get(materialId)?.[SCENE_MATERIAL_IMAGE_FIELDS[paintImageKind]] ===
                  paintImageId
              )
            }),
          )
        : null,
    [mesh, primary, paintImageId, paintImageKind, materialsById],
  )
  const viewport = (content: (scale: number) => React.ReactNode) => (
    <SceneTextureViewport
      image={image}
      imageKey={imageKey}
      view={adjusting ? state.uvView : state.view}
      onView={adjusting ? state.setUvView : state.setView}
      bounds={bounds}
      contentBounds={contentBounds}
      onCancel={cancel}
    >
      {content}
    </SceneTextureViewport>
  )
  return (
    <>
      <section
        className="mld-paint-sheet"
        data-workspace-area={workshop.area}
        data-show-model={state.showModel}
        aria-label="Área Folha de pintura"
      >
        <h2 tabIndex={-1} className="sr-only">
          Folha de pintura
        </h2>
        <div className="mld-sheet-heading">
          <div className="mld-sheet-mode" role="toolbar" aria-label="Modo da folha">
            {can('paint.sheet') && (
              <Button
                size="compact"
                variant="ghost"
                aria-label="Pintar na folha"
                className="px-2 text-xs"
                aria-pressed={!adjusting}
                onClick={() => workshop.openArea('sheet')}
              >
                Pintar
              </Button>
            )}
            {can('paint.uv') && (
              <Button
                size="compact"
                variant="ghost"
                aria-pressed={adjusting}
                className="px-2 text-xs"
                onClick={() => workshop.openArea('uv')}
              >
                Ajustar mapa
              </Button>
            )}
          </div>
          <div className="mld-sheet-device-switch">
            <Button
              size="compact"
              variant="ghost"
              className="px-2 text-xs"
              onClick={() => state.setShowModel(!state.showModel)}
            >
              {state.showModel ? 'Ver folha' : 'Ver modelo'}
            </Button>
          </div>
          <ToolButton
            icon={state.expanded ? Minimize2 : Maximize2}
            label={state.expanded ? 'Restaurar folha' : 'Ampliar folha'}
            active={state.expanded}
            className="max-[1199px]:hidden"
            onClick={() => state.setExpanded(!state.expanded)}
          />
          <ToolButton
            icon={X}
            label="Fechar folha de pintura"
            onClick={() => workshop.openArea(null)}
          />
        </div>
        <div className="mld-sheet-body">
          {adjusting && uv ? (
            <SceneUvEditor
              {...uv}
              compact
              extraActions={
                <Button
                  size="compact"
                  variant="ghost"
                  className="mld-uv-organize"
                  disabled={!components.canEdit}
                  onClick={workshop.mapPaintUv}
                >
                  <Grid3x3 className="size-4" aria-hidden="true" />
                  Organizar mapa
                </Button>
              }
              renderCanvas={(props) =>
                viewport((scale) => (
                  <SceneUvCanvas
                    {...props}
                    sheetScale={scale}
                    sheetSize={image}
                    sheetAspect={image.width / image.height}
                    cancelKey={cancelKey}
                  />
                ))
              }
            />
          ) : !adjusting && paint.data && texture ? (
            <>
              <div className="mld-sheet-paint-actions">
                <span className="text-xs text-mld-muted">Pinte aqui ou no modelo</span>
                <SceneToolbarMenu label="Opções da folha" iconOnly>
                  <Button
                    size="compact"
                    variant="ghost"
                    data-close-menu
                    disabled={!components.canEdit || paint.drawing || paint.busy}
                    onClick={workshop.mapPaintUv}
                  >
                    <Grid3x3 className="size-4" aria-hidden="true" />
                    Organizar mapa
                  </Button>
                </SceneToolbarMenu>
              </div>
              {viewport((scale) => (
                <ScenePaintCanvas
                  image={texture.image}
                  palette={palette}
                  base={texture.base}
                  drawing={paint.drawing}
                  actions={paint.actions}
                  twoPoint={paint.shape !== null}
                  draft={paint.draft}
                  scope={paint.scope}
                  sheet
                  viewScale={scale}
                  overlay={
                    mesh ? (
                      <>
                        <svg
                          aria-hidden="true"
                          viewBox={`0 0 ${image.width} ${image.height}`}
                          className="mld-uv-sheet-outlines"
                        >
                          {paintLayout && (
                            <SceneUvOutlines
                              faces={paintLayout.faces}
                              ids={paintIds}
                              width={image.width}
                              height={image.height}
                              scale={scale}
                            />
                          )}
                        </svg>
                        {paint.grid && <SceneTextureGrid image={image} scale={scale} />}
                      </>
                    ) : undefined
                  }
                />
              ))}
            </>
          ) : (
            <div className="mld-sheet-empty">
              <Grid3x3 className="size-8 text-mld-muted" aria-hidden="true" />
              <p>
                {adjusting && primary && !components.canEdit
                  ? 'Esta peça está travada. Destrave para ajustar o mapa.'
                  : 'Escolha uma peça no modelo para abrir sua folha.'}
              </p>
            </div>
          )}
          {adjusting && uv && (
            <p className="mld-sheet-hint">
              Arraste os pontos para mover. Use as alças para mudar o tamanho ou girar. Você pode
              desfazer.
            </p>
          )}
        </div>
      </section>
      <hr
        className="mld-sheet-divider"
        tabIndex={0}
        aria-label="Largura da folha"
        aria-orientation="vertical"
        aria-valuemin={30}
        aria-valuemax={65}
        aria-valuenow={state.width}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
          event.preventDefault()
          state.setWidth(
            Math.max(30, Math.min(65, state.width + (event.key === 'ArrowRight' ? 2 : -2))),
          )
        }}
        onPointerDown={(event) => {
          event.preventDefault()
          cancel()
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMove={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
          resizeFromPointer(event.currentTarget, event.clientX)
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            resizeFromPointer(event.currentTarget, event.clientX)
            event.currentTarget.releasePointerCapture(event.pointerId)
          }
        }}
      />
    </>
  )
}
