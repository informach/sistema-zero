import type { JSX } from 'react'
import { COPY } from '../../core/copy'
import { newId } from '../../core/id'
import { type AnyTilesetAsset, withPintaSchemaStamp } from '../../core/project'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { useEditorStores } from './editorContext'
import { CommitInput } from './MapObjectPanel'
import { MapProperties } from './MapProperties'
import { MAP_EDITOR_LIMITS } from './mapTools/mapEditorLimits'

const frameIds = new WeakMap<object, string>()
function frameKey(frame: object): string {
  let id = frameIds.get(frame)
  if (!id) {
    id = newId()
    frameIds.set(frame, id)
  }
  return id
}
export function TileAnimationPanel({
  tileset,
  tile,
}: {
  tileset: AnyTilesetAsset
  tile: number
}): JSX.Element {
  const { editor } = useEditorStores(),
    frames = tileset.animations?.[String(tile)] ?? []
  const save = (next: typeof frames): void => {
    const animations = { ...tileset.animations }
    if (next.length) animations[String(tile)] = next
    else delete animations[String(tile)]
    const { animations: _old, ...rest } = tileset
    const after = withPintaSchemaStamp({
      ...rest,
      ...(Object.keys(animations).length ? { animations } : {}),
    })
    const s = editor.getState()
    if (s.asset.id === tileset.id) s.commit(after)
    else s.commitLinked(s.asset, { before: [tileset], after: [after] })
  }
  return (
    <Panel title={COPY.scene.dynamicAnimacaoDaPeca(tile)}>
      <MapProperties
        value={tileset.tileProperties?.[tile]}
        onChange={(properties) => {
          const tileProperties = { ...tileset.tileProperties, [tile]: properties },
            s = editor.getState(),
            next = withPintaSchemaStamp({ ...tileset, tileProperties })
          if (s.asset.id === tileset.id) s.commit(next)
          else s.commitLinked(s.asset, { before: [tileset], after: [next] })
        }}
      />
      <div className="flex flex-col gap-1">
        {frames.map((frame, i) => (
          <div key={frameKey(frame)} className="flex gap-1">
            <select
              aria-label={COPY.scene.dynamicPecaDoQuadro(i + 1)}
              className="min-h-11 min-w-0 flex-1 rounded-xl border-2 border-pin-border bg-pin-surface px-2"
              value={frame.tile}
              onChange={(e) =>
                save(frames.map((f, n) => (n === i ? { ...f, tile: Number(e.target.value) } : f)))
              }
            >
              {[...tileset.tiles.keys()].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            {/* O número só vale ao sair do campo ou no Enter: digitar "500" grava 500, uma vez. */}
            <div className="w-20 shrink-0">
              <CommitInput
                numeric
                aria-label={COPY.scene.dynamicDuracaoDoQuadroEmMilissegundos(i + 1)}
                value={String(frame.duration)}
                onCommit={(text) => {
                  const typed = Number(text.replace(',', '.'))
                  if (!Number.isFinite(typed)) return
                  const duration = Math.round(
                    Math.max(
                      MAP_EDITOR_LIMITS.minFrameDurationMs,
                      Math.min(MAP_EDITOR_LIMITS.maxFrameDurationMs, typed),
                    ),
                  )
                  if (duration !== frame.duration)
                    save(frames.map((f, n) => (n === i ? { ...f, duration } : f)))
                }}
              />
            </div>
            <Button
              variant="barOutline"
              aria-label={COPY.scene.removeFrame(i + 1)}
              onClick={() => save(frames.filter((_, n) => n !== i))}
            >
              {COPY.scene.texto}
            </Button>
          </div>
        ))}
      </div>
      <Button
        variant="barOutline"
        className="mt-2 w-full"
        disabled={frames.length >= MAP_EDITOR_LIMITS.maxTileAnimationFrames}
        onClick={() =>
          save([...frames, { tile, duration: MAP_EDITOR_LIMITS.defaultFrameDurationMs }])
        }
      >
        {COPY.scene.maisUmQuadro}
      </Button>
    </Panel>
  )
}
