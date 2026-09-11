/**
 * A cor e o acabamento da peça no Modelar, à vista, como no editor antigo: tocar numa cor
 * pinta a peça inteira, e Fosco, Brilhante e Metal mudam como a luz aparece nela.
 *
 * ⚠️ Pela peça (`patchScenePieceAppearance`), nunca pelo material: o material pode ser dividido,
 * e mudar a porta de azul não pode mudar junto toda peça que usa o mesmo material.
 */
import { clsx } from 'clsx'
import { COPY } from '../../../core/copy'
import { SCENE_PAINT_COPY } from '../../../core/scenePaintCopy'
import { evaluateSceneNodeFlags } from '../../../scene/evaluate'
import {
  patchScenePieceAppearance,
  SCENE_FINISH_PRESETS,
  type SceneFinishPreset,
  sceneFinishOf,
} from '../../../scene/pieceAppearance'
import { RequiresTool } from '../../toolAccess'
import { Button } from '../../ui/Button'
import { scenePaletteSwatches } from './ScenePaintPalette'
import type { useSceneWorkshop } from './useSceneWorkshop'

export function ScenePieceFinish({ workshop }: { workshop: ReturnType<typeof useSceneWorkshop> }) {
  const { primary, document, index, run } = workshop
  if (primary?.kind !== 'mesh') return null
  const material = document.materials.find((entry) => entry.id === primary.materialId)
  if (!material) return null
  const locked = evaluateSceneNodeFlags(index.scene).get(primary.id)?.locked ?? false
  const finish = sceneFinishOf(material)
  const copy = COPY.scene
  return (
    <RequiresTool family="model.finish">
      <fieldset disabled={locked} className="space-y-1">
        <legend className="text-sm font-bold text-mld-text">{SCENE_PAINT_COPY.pieceColor}</legend>
        <div className="flex flex-wrap gap-1">
          {scenePaletteSwatches(document).map(({ index: colorIndex, hex }) => {
            const active =
              material.baseColor.kind === 'palette' && material.baseColor.index === colorIndex
            return (
              <button
                key={colorIndex}
                type="button"
                aria-label={COPY.a11y.colorSwatch(colorIndex, hex)}
                aria-pressed={active}
                onClick={() =>
                  run((source) =>
                    patchScenePieceAppearance(source, primary.id, {
                      baseColor: { kind: 'palette', index: colorIndex },
                    }),
                  )
                }
                className={clsx(
                  'aspect-square min-h-11 min-w-11 rounded-md border-2 transition',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mld-accent',
                  'disabled:cursor-not-allowed disabled:opacity-40',
                  active
                    ? 'scale-110 border-mld-text'
                    : 'border-mld-border/60 hover:border-mld-text',
                )}
                style={{ backgroundColor: hex }}
              />
            )
          })}
        </div>
      </fieldset>
      <fieldset disabled={locked} className="space-y-1">
        <legend className="text-sm font-bold text-mld-text">{SCENE_PAINT_COPY.finish}</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(SCENE_FINISH_PRESETS) as SceneFinishPreset[]).map((kind) => (
            <Button
              key={kind}
              variant="ghost"
              className="flex-1 px-2 text-sm"
              aria-pressed={finish === kind}
              onClick={() =>
                run((source) =>
                  patchScenePieceAppearance(source, primary.id, SCENE_FINISH_PRESETS[kind]),
                )
              }
            >
              {copy.materialPresets[kind]}
            </Button>
          ))}
        </div>
      </fieldset>
    </RequiresTool>
  )
}
