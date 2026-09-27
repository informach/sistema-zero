/**
 * A cor e o acabamento da peça no Modelar, à vista, como no editor antigo: tocar numa cor
 * pinta a peça inteira, e Fosco, Brilhante e Metal mudam como a luz aparece nela.
 *
 * Desde 11/09/2026 mora na FAIXA DE BAIXO do Modelar (a das telas-modelo, onde a imagem põe os
 * materiais): o acabamento em amostras grandes com o nome embaixo, que mostram a cor da peça
 * com aquele jeito de luz, e as cores numa fileira. Foi MOVIDO do painel da direita, não copiado.
 *
 * ⚠️ Pela peça (`patchScenePieceAppearance`), nunca pelo material: o material pode ser dividido,
 * e mudar a porta de azul não pode mudar junto toda peça que usa o mesmo material.
 */
import { clsx } from 'clsx'
import type { CSSProperties } from 'react'
import { COPY } from '../../../core/copy'
import { resolvePaletteColors } from '../../../core/sanitize'
import { SCENE_PAINT_COPY } from '../../../core/scenePaintCopy'
import { evaluateSceneNodeFlags } from '../../../scene/evaluate'
import {
  patchScenePieceAppearance,
  SCENE_FINISH_PRESETS,
  type SceneFinishPreset,
  sceneFinishOf,
} from '../../../scene/pieceAppearance'
import { RequiresTool } from '../../toolAccess'
import { swatchClass } from '../../ui/interaction'
import { scenePaletteSwatches } from './ScenePaintPalette'
import type { useSceneWorkshop } from './useSceneWorkshop'

/** A amostra de cada acabamento, na cor da peça: fosco é chapado, brilhante tem o reflexo, metal
 * tem as faixas de luz. É só desenho (o nome está no texto do botão). */
function finishPreview(kind: SceneFinishPreset, hex: string): CSSProperties {
  if (kind === 'shiny')
    return {
      background: `radial-gradient(circle at 32% 28%, oklch(1 0 0 / 0.95) 0 12%, transparent 30%), radial-gradient(circle at 50% 55%, ${hex}, color-mix(in oklab, ${hex} 70%, black))`,
    }
  if (kind === 'metal')
    return {
      background: `linear-gradient(135deg, color-mix(in oklab, ${hex} 55%, white) 0%, ${hex} 38%, color-mix(in oklab, ${hex} 60%, black) 62%, color-mix(in oklab, ${hex} 70%, white) 100%)`,
    }
  return { background: hex }
}

export function ScenePieceFinish({ workshop }: { workshop: ReturnType<typeof useSceneWorkshop> }) {
  const { primary, document, index, run } = workshop
  if (primary?.kind !== 'mesh') return null
  const material = document.materials.find((entry) => entry.id === primary.materialId)
  if (!material) return null
  const locked = evaluateSceneNodeFlags(index.scene).get(primary.id)?.locked ?? false
  const finish = sceneFinishOf(material)
  const copy = COPY.scene
  const baseHex =
    material.baseColor.kind === 'palette'
      ? (resolvePaletteColors(document)[material.baseColor.index] ?? '#8a94a6')
      : '#8a94a6'
  return (
    <RequiresTool family="model.finish">
      <div className="flex min-w-max items-start gap-5">
        <fieldset disabled={locked} className="flex shrink-0 flex-col gap-2">
          <legend className="mld-kicker mb-2">{SCENE_PAINT_COPY.finish}</legend>
          <div className="flex gap-2">
            {(Object.keys(SCENE_FINISH_PRESETS) as SceneFinishPreset[]).map((kind) => (
              <button
                key={kind}
                type="button"
                aria-pressed={finish === kind}
                onClick={() =>
                  run((source) =>
                    patchScenePieceAppearance(source, primary.id, SCENE_FINISH_PRESETS[kind]),
                  )
                }
                className={clsx(
                  'group flex w-16 flex-col items-center gap-1 rounded-xl p-1 text-xs font-bold text-mld-text',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mld-accent',
                  'disabled:cursor-not-allowed disabled:opacity-40',
                  'aria-pressed:text-mld-accent',
                )}
              >
                <span
                  aria-hidden="true"
                  style={finishPreview(kind, baseHex)}
                  className="block h-10 w-14 rounded-lg border-2 border-mld-border/60 group-aria-pressed:border-mld-surface group-aria-pressed:ring-2 group-aria-pressed:ring-mld-accent group-aria-pressed:ring-offset-2 group-aria-pressed:ring-offset-mld-surface"
                />
                {copy.materialPresets[kind]}
              </button>
            ))}
          </div>
        </fieldset>
        <span aria-hidden="true" className="w-px self-stretch bg-mld-border" />
        <fieldset disabled={locked} className="flex min-w-0 flex-col gap-2">
          <legend className="mld-kicker mb-2">{SCENE_PAINT_COPY.pieceColor}</legend>
          <div className="flex gap-1.5">
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
                  className={swatchClass(active)}
                  style={{ backgroundColor: hex }}
                />
              )
            })}
          </div>
        </fieldset>
      </div>
    </RequiresTool>
  )
}
