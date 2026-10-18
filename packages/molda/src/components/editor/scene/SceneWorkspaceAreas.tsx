import { useLayoutEffect, useRef } from 'react'
import { COPY } from '../../../core/copy'
import { SCENE_PAINT_COPY } from '../../../core/scenePaintCopy'
import { useMoldaToolAccess } from '../../toolAccess'
import { Button } from '../../ui/Button'
import { Paintbrush } from '../../ui/icons'
import { SceneToolbarMenu } from './SceneToolbarMenu'
import type { useSceneWorkshop } from './useSceneWorkshop'
import { SCENE_WORKSPACE_AREAS, type SceneWorkspaceArea } from './workspaceAreaRegistry'

export function SceneWorkspaceAreas({
  workshop,
}: {
  workshop: ReturnType<typeof useSceneWorkshop>
}) {
  const { can } = useMoldaToolAccess()
  const navigation = useRef<HTMLElement>(null)
  const previous = useRef(workshop.area)
  useLayoutEffect(() => {
    const before = previous.current
    previous.current = workshop.area
    if (before === workshop.area) return
    if (workshop.area)
      navigation.current?.parentElement
        ?.querySelector<HTMLElement>('[data-workspace-area] h2')
        ?.focus()
    else if (before) {
      const button = navigation.current?.querySelector<HTMLButtonElement>(
        `[data-area="${before === 'uv' ? 'sheet' : before}"]`,
      )
      const target =
        button ?? navigation.current?.querySelector<HTMLButtonElement>('[data-toolbar-menu]')
      target?.focus()
    }
  }, [workshop.area])
  const areas = (Object.keys(SCENE_WORKSPACE_AREAS) as SceneWorkspaceArea[]).filter(
    (area) =>
      SCENE_WORKSPACE_AREAS[area].mode === workshop.mode && can(SCENE_WORKSPACE_AREAS[area].family),
  )
  if (!areas.length) return null
  const painting = workshop.mode === 'paint'
  const buttons = (items: readonly SceneWorkspaceArea[]) =>
    items.map((area) => (
      <Button
        size="compact"
        key={area}
        data-area={area}
        variant="ghost"
        className="mld-toolbar-action px-3 text-xs"
        data-close-menu
        aria-pressed={workshop.area === area}
        onClick={() => workshop.openArea(workshop.area === area ? null : area)}
      >
        {area === 'mesh' && workshop.primary && workshop.index.skinsByNode.has(workshop.primary.id)
          ? COPY.scene.editSkinBase
          : SCENE_WORKSPACE_AREAS[area].label}
      </Button>
    ))
  return (
    <nav ref={navigation} aria-label="Áreas da oficina" className="mld-workspace-areas">
      {workshop.area && !painting && (
        <Button
          size="compact"
          variant="ghost"
          className="mld-toolbar-action px-3 text-xs"
          onClick={() => workshop.openArea(null)}
        >
          Voltar ao{' '}
          {workshop.mode === 'model'
            ? 'modelo'
            : workshop.mode === 'paint'
              ? 'pincel'
              : 'movimento'}
        </Button>
      )}
      {painting ? (
        <>
          <p className="mld-workspace-caption">{SCENE_PAINT_COPY.directPaint}</p>
          {areas.some((area) => area === 'sheet' || area === 'uv') && (
            <Button
              size="compact"
              variant="ghost"
              className="mld-toolbar-action px-3 text-xs"
              data-area="sheet"
              aria-pressed={workshop.area === 'sheet' || workshop.area === 'uv'}
              onClick={() =>
                workshop.openArea(
                  workshop.area === 'sheet' || workshop.area === 'uv'
                    ? null
                    : areas.includes('sheet')
                      ? 'sheet'
                      : 'uv',
                )
              }
            >
              <Paintbrush className="size-4" aria-hidden="true" />
              Folha de pintura
            </Button>
          )}
          {areas.includes('materials') && (
            <SceneToolbarMenu>{buttons(['materials'])}</SceneToolbarMenu>
          )}
        </>
      ) : (
        buttons(areas)
      )}
    </nav>
  )
}
