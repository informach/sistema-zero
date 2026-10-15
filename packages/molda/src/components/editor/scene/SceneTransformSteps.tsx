import { useState } from 'react'
import type { Vec3 } from '../../../core/model'
import { SCENE_SHELL_COPY } from '../../../core/sceneShellCopy'
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
import { ArrowDownToLine, ArrowUpFromLine, Minus, Plus } from '../../ui/icons'
import { adjustScene } from './sceneAdjustment'
import type { useSceneWorkshop } from './useSceneWorkshop'

const AXIS_KEYS = ['x', 'y', 'z'] as const
/** "Colocar no chão" e "Colocar em cima": dois cartões iguais lado a lado, o ícone em cima. */
const PLACE_BUTTON =
  'flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border-[1.5px] border-mld-border bg-mld-surface px-2 py-2 text-center text-[0.8125rem] font-bold leading-tight text-mld-text transition hover:border-mld-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mld-accent disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:border-mld-accent aria-pressed:bg-mld-accent/10 aria-pressed:text-mld-accent'

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
      {/*
       * Uma linha por eixo: o selo da letra na MESMA cor da alça do palco e da legenda, o nome
       * como a criança diz ("lado", "altura") e os passos − e +. O nome acessível dos botões
       * segue "Mover Lado · X mais".
       */}
      {(tool !== 'scale' || stretch) &&
        axes.map((label, axis) => (
          <div key={label} className="flex min-h-11 items-center gap-2 text-sm">
            <span aria-hidden="true" className="mld-axis" data-axis={AXIS_KEYS[axis]}>
              {AXIS_KEYS[axis]?.toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 font-semibold text-mld-text">
              {SCENE_SHELL_COPY.axes[axis]}
            </span>
            <button
              type="button"
              className="mld-step"
              disabled={disabled}
              aria-label={`${toolLabel} ${label} menos`}
              onClick={() => step(axis, -1)}
            >
              <Minus aria-hidden="true" />
            </button>
            <button
              type="button"
              className="mld-step"
              disabled={disabled}
              aria-label={`${toolLabel} ${label} mais`}
              onClick={() => step(axis, 1)}
            >
              <Plus aria-hidden="true" />
            </button>
          </div>
        ))}
      {tool === 'move' && workshop.mode !== 'animation' && (
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <button
            type="button"
            className={PLACE_BUTTON}
            disabled={disabled}
            onClick={() => run((source) => placeSceneNodesOnGround(source, selected))}
          >
            <ArrowDownToLine aria-hidden="true" className="size-4" />
            {SCENE_SHELL_COPY.placeOnGround}
          </button>
          <button
            type="button"
            className={PLACE_BUTTON}
            disabled={disabled}
            onClick={workshop.startPlacement}
            aria-pressed={workshop.placing}
          >
            <ArrowUpFromLine aria-hidden="true" className="size-4" />
            {SCENE_SHELL_COPY.placeOnTop}
          </button>
        </div>
      )}
    </section>
  )
}
