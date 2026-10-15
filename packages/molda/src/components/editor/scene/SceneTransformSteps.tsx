import { useState } from 'react'
import type { Vec3 } from '../../../core/model'
import { selectSceneSubtrees } from '../../../scene/graph'
import {
  affineMultiply,
  composeTransform,
  identityMatrix,
  quaternionFromEulerXYZ,
  transformPoint,
} from '../../../scene/matrix'
import { placeSceneNodesOnGround } from '../../../scene/placement'
import { Button } from '../../ui/Button'
import { adjustScene } from './sceneAdjustment'
import type { useSceneWorkshop } from './useSceneWorkshop'

export function SceneTransformSteps({
  workshop,
}: {
  workshop: ReturnType<typeof useSceneWorkshop>
}) {
  const { tool, selected, run } = workshop
  const [stretch, setStretch] = useState(false)
  const [keepBase, setKeepBase] = useState(false)
  const disabled = !selected.length
  if (tool !== 'move' && tool !== 'rotate' && tool !== 'scale') return null
  const axes = ['Lado · X', 'Altura · Y', 'Frente e fundo · Z']
  const toolLabel = { move: 'Mover', rotate: 'Girar', scale: 'Tamanho' }[tool]
  function apply(values: Vec3) {
    if (workshop.mode !== 'animation') {
      run((source) =>
        adjustScene(source, selected, tool as 'move' | 'rotate' | 'scale', values, keepBase),
      )
      return
    }
    const pose = workshop.animationPose.getSnapshot().pose ?? workshop.animation.getSnapshot().pose
    const roots = selectSceneSubtrees(workshop.index.scene, selected).roots
    const points = [...roots].flatMap((id) => {
      const matrix = pose?.worldMatrices.get(id)
      return matrix ? [transformPoint(matrix, [0, 0, 0])] : []
    })
    const center: Vec3 = points.length
      ? ([0, 1, 2].map(
          (axis) => points.reduce((sum, point) => sum + point[axis]!, 0) / points.length,
        ) as Vec3)
      : [0, 0, 0]
    let delta = composeTransform({
      kind: 'trs',
      translation: tool === 'move' ? values : [0, 0, 0],
      rotation: tool === 'rotate' ? quaternionFromEulerXYZ(values) : [0, 0, 0, 1],
      scale: tool === 'scale' ? values : [1, 1, 1],
    })
    if (tool !== 'move') {
      const forward = identityMatrix(),
        backward = identityMatrix()
      for (const axis of [0, 1, 2] as const) {
        forward[12 + axis] = center[axis]
        backward[12 + axis] = -center[axis]
      }
      delta = affineMultiply(forward, affineMultiply(delta, backward))
    }
    const actions = workshop.animationPose.transformActions(selected)
    if (actions.begin()) {
      const accepted = actions.preview(delta)
      actions.end(accepted)
    }
  }
  function step(axis: number, direction: number) {
    const values: Vec3 = tool === 'scale' ? [1, 1, 1] : [0, 0, 0]
    values[axis] =
      tool === 'move'
        ? direction * 0.5
        : tool === 'rotate'
          ? direction * 90
          : direction > 0
            ? 1.2
            : 1 / 1.2
    apply(values)
  }
  return (
    <section aria-label="Ajustar por cliques" className="space-y-2">
      {tool === 'scale' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Button disabled={disabled} onClick={() => apply([1 / 1.2, 1 / 1.2, 1 / 1.2])}>
              Menor
            </Button>
            <Button disabled={disabled} onClick={() => apply([1.2, 1.2, 1.2])}>
              Maior
            </Button>
          </div>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="stretch"
              checked={stretch}
              onChange={(e) => setStretch(e.target.checked)}
            />
            Esticar em uma direção
          </label>
          {workshop.mode === 'model' && (
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="keep-base"
                checked={keepBase}
                onChange={(e) => setKeepBase(e.target.checked)}
              />
              Manter a base no lugar
            </label>
          )}
        </>
      )}
      {(tool !== 'scale' || stretch) &&
        axes.map((label, axis) => (
          <div key={label} className="grid grid-cols-[1fr_44px_44px] items-center gap-1 text-sm">
            <span>{label}</span>
            <Button
              className="px-0"
              disabled={disabled}
              aria-label={`${toolLabel} ${label} menos`}
              onClick={() => step(axis, -1)}
            >
              −
            </Button>
            <Button
              className="px-0"
              disabled={disabled}
              aria-label={`${toolLabel} ${label} mais`}
              onClick={() => step(axis, 1)}
            >
              +
            </Button>
          </div>
        ))}
      {tool === 'move' && workshop.mode !== 'animation' && (
        <div className="flex flex-col gap-1">
          <Button
            disabled={disabled}
            onClick={() => run((source) => placeSceneNodesOnGround(source, selected))}
          >
            Colocar no chão
          </Button>
          <Button
            disabled={disabled}
            onClick={workshop.startPlacement}
            aria-pressed={workshop.placing}
          >
            Colocar em cima
          </Button>
        </div>
      )}
    </section>
  )
}
