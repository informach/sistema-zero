import { useLayoutEffect, useRef } from 'react'
import { COPY } from '../../../core/copy'
import { useMoldaToolAccess } from '../../toolAccess'
import { Button } from '../../ui/Button'
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
    else if (before)
      navigation.current?.querySelector<HTMLButtonElement>(`[data-area="${before}"]`)?.focus()
  }, [workshop.area])
  const areas = (Object.keys(SCENE_WORKSPACE_AREAS) as SceneWorkspaceArea[]).filter(
    (area) =>
      SCENE_WORKSPACE_AREAS[area].mode === workshop.mode && can(SCENE_WORKSPACE_AREAS[area].family),
  )
  if (!areas.length) return null
  return (
    <nav ref={navigation} aria-label="Áreas da oficina" className="mld-workspace-areas">
      {workshop.area && (
        <Button className="px-3 text-xs" onClick={() => workshop.openArea(null)}>
          Voltar ao{' '}
          {workshop.mode === 'model'
            ? 'modelo'
            : workshop.mode === 'paint'
              ? 'pincel'
              : 'movimento'}
        </Button>
      )}
      {areas.map((area) => (
        <Button
          key={area}
          data-area={area}
          className="px-3 text-xs"
          aria-pressed={workshop.area === area}
          onClick={() => workshop.openArea(workshop.area === area ? null : area)}
        >
          {area === 'mesh' &&
          workshop.primary &&
          workshop.index.skinsByNode.has(workshop.primary.id)
            ? COPY.scene.editSkinBase
            : SCENE_WORKSPACE_AREAS[area].label}
        </Button>
      ))}
    </nav>
  )
}
