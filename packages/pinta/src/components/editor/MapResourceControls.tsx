import type { JSX } from 'react'
import { COPY } from '../../core/copy'
import { withMapResourceVersions } from '../../core/mapResourceVersions'
import {
  effectiveLayer,
  isObjectLayer,
  type PintaAsset,
  type TilemapAsset,
  type TilemapObject,
} from '../../core/project'
import { updateMapObject } from '../../tiles/mapObjects'
import {
  freezeObjectResource,
  linkObjectResource,
  type ResourceVersionEdit,
} from '../../tiles/resourceVersions'
import { Button } from '../ui/Button'
import { useToast } from '../ui/Toast'
import { useEditorStores } from './editorContext'
import { RESOURCE_VERSION_MESSAGES } from './mapTools/resourceVersionMessages'

export function MapResourceControls({
  map,
  object,
  layerId,
  find,
}: {
  map: TilemapAsset
  object: TilemapObject
  layerId: string
  find: (id: string) => PintaAsset | null
}): JSX.Element | null {
  const { editor } = useEditorStores(),
    { showToast } = useToast()
  if (!object.art) return null
  const asset = withMapResourceVersions(map, find)(object.art.assetId)
  const pinned = map.resources?.some((version) => version.asset.id === object.art?.assetId) ?? false
  const animations =
    asset?.kind === 'pixel-sprite' || asset?.kind === 'vector-sprite' ? asset.animations : []
  const run = (
    edit: (current: TilemapAsset) => ResourceVersionEdit,
    needsUnlockedLayer = true,
  ): void => {
    const state = editor.getState(),
      current = state.asset
    if (current.kind !== 'tilemap' || current.id !== map.id) return
    const layer = current.layers.find((entry) => entry.id === layerId)
    const result: ResourceVersionEdit =
      needsUnlockedLayer && layer && effectiveLayer(current, layer).locked
        ? { ok: false, reason: 'locked' }
        : edit(current)
    if (result.ok) {
      if (result.map !== current) state.commit(result.map)
      return
    }
    showToast(RESOURCE_VERSION_MESSAGES[result.reason])
  }
  return (
    <div className="mb-3 flex flex-col gap-2">
      <p className="text-xs text-pin-muted">
        {pinned ? COPY.scene.resourceFrozen : COPY.scene.resourceLinked}
      </p>
      <Button
        variant="barOutline"
        className="w-full"
        onClick={() => run((current) => freezeObjectResource(current, layerId, object.id, find))}
      >
        {pinned ? COPY.scene.updateResourceVersion : COPY.scene.keepResourceVersion}
      </Button>
      {pinned ? (
        <Button
          variant="barOutline"
          className="w-full"
          onClick={() => run((current) => linkObjectResource(current, layerId, object.id, find))}
        >
          {COPY.scene.followResource}
        </Button>
      ) : null}
      {animations.length > 0 || object.art.animationId !== undefined ? (
        <label className="flex flex-col gap-1 text-xs font-bold text-pin-muted">
          {COPY.scene.objectAnimation}
          <select
            className="min-h-11 w-full rounded-xl border-2 border-pin-border bg-pin-surface px-2 text-sm text-pin-text"
            value={object.art.animationId ?? ''}
            onChange={(event) => {
              const animationId = event.currentTarget.value
              run((current) => {
                const layer = current.layers.find((entry) => entry.id === layerId)
                const target =
                  layer && isObjectLayer(layer)
                    ? layer.objects.find((entry) => entry.id === object.id)
                    : null
                if (!target?.art) return { ok: false, reason: 'missing' }
                const { animationId: _old, ...art } = target.art
                return {
                  ok: true,
                  map: updateMapObject(current, layerId, object.id, {
                    art: { ...art, ...(animationId ? { animationId } : {}) },
                  }),
                }
              })
            }}
          >
            <option value="">{COPY.scene.noObjectAnimation}</option>
            {object.art.animationId &&
            !animations.some((animation) => animation.id === object.art?.animationId) ? (
              <option value={object.art.animationId} disabled>
                {COPY.scene.missingObjectAnimation}
              </option>
            ) : null}
            {animations.map((animation) => (
              <option key={animation.id} value={animation.id}>
                {animation.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  )
}
