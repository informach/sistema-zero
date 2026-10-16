import type { Vec3 } from '../../../core/model'
import { evaluateSceneNodeFlags } from '../../../scene/evaluate'
import {
  sceneLocalBounds,
  sceneNodePivot,
  setSceneAuthoringPivot,
  setScenePivotPreset,
} from '../../../scene/pivot'
import { useMoldaToolAccess } from '../../toolAccess'
import { Button } from '../../ui/Button'
import type { useSceneWorkshop } from './useSceneWorkshop'

type Workshop = ReturnType<typeof useSceneWorkshop>

export function ScenePivotChoices({
  workshop,
  compact = false,
  precision = false,
}: {
  workshop: Workshop
  compact?: boolean
  precision?: boolean
}) {
  const { can } = useMoldaToolAccess()
  const id = workshop.selected.length === 1 ? workshop.selected[0] : null
  const node = id ? workshop.index.scene.nodes.get(id) : null,
    bounds = id ? sceneLocalBounds(workshop.document, id) : null,
    pivot = node ? sceneNodePivot(node) : null,
    locked = id ? evaluateSceneNodeFlags(workshop.index.scene).get(id)?.locked : true
  const active = (preset: 'center' | 'bottom' | 'corner') => {
    if (!bounds || !pivot) return false
    const point =
      preset === 'center'
        ? bounds.center
        : preset === 'bottom'
          ? bounds.base
          : [bounds.max[0], bounds.min[1], bounds.max[2]]
    return point.every((n, i) => Math.abs(n - pivot[i]!) <= Math.max(...bounds.size) * 1e-10)
  }
  return (
    <div className={compact ? 'mld-pivot-presets flex flex-wrap items-center gap-2' : 'space-y-2'}>
      {!precision && (
        <>
          <span className="text-xs whitespace-nowrap text-mld-muted">Colocar no:</span>
          <div className="flex flex-wrap gap-1">
            <Button
              disabled={!id || locked}
              aria-pressed={active('center')}
              onClick={() =>
                id && workshop.run((source) => setScenePivotPreset(source, id, 'center'))
              }
            >
              Centro
            </Button>
            <Button
              disabled={!id || locked}
              aria-pressed={active('bottom')}
              onClick={() =>
                id && workshop.run((source) => setScenePivotPreset(source, id, 'bottom'))
              }
            >
              Embaixo
            </Button>
            <Button
              disabled={!id || locked}
              aria-pressed={active('corner')}
              onClick={() =>
                id && workshop.run((source) => setScenePivotPreset(source, id, 'corner'))
              }
            >
              Canto
            </Button>
          </div>
        </>
      )}
      {precision && can('model.precise') && (
        <details className="rounded-lg border border-mld-border bg-mld-surface p-2 text-xs">
          <summary className="cursor-pointer font-bold">Mais posições do pivô</summary>
          <label className="flex min-h-11 items-center gap-2">
            <input
              name="pivotVertical"
              type="checkbox"
              checked={workshop.pivotVertical}
              onChange={(event) => workshop.setPivotVertical(event.target.checked)}
            />
            Mostrar alça Y
          </label>
          <label className="flex min-h-11 items-center gap-2">
            <input
              name="pivotSnapVertex"
              type="checkbox"
              disabled={node?.kind !== 'mesh' || locked}
              checked={workshop.pivotSnap}
              onChange={(event) => changeSnap(event.target.checked)}
            />
            Encaixar em um ponto da peça
          </label>
          {workshop.pivotSnap && (
            <p role="status">
              Clique em um ponto visível da peça. A câmera continua livre para girar.
            </p>
          )}
          <div className="grid grid-cols-2 gap-1">
            {bounds &&
              [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
                const point = [0, 1, 2].map(
                  (axis) => (i & (1 << axis) ? bounds.max : bounds.min)[axis],
                ) as Vec3
                return (
                  <Button
                    key={i}
                    disabled={!id || locked}
                    aria-pressed={point.every((n, axis) => n === pivot?.[axis])}
                    onClick={() =>
                      id && workshop.run((source) => setSceneAuthoringPivot(source, id, point))
                    }
                  >
                    Canto {i & 1 ? '+X' : '−X'} {i & 2 ? '+Y' : '−Y'} {i & 4 ? '+Z' : '−Z'}
                  </Button>
                )
              })}
          </div>
        </details>
      )}
    </div>
  )
  function changeSnap(enabled: boolean) {
    workshop.cancelGesture()
    workshop.setPivotSnap(enabled)
  }
}

export function SceneDivisionChoices({ workshop }: { workshop: Workshop }) {
  const id = workshop.components.selection?.nodeId
  return (
    <div className="space-y-2 rounded-xl bg-mld-bg p-2">
      <h4 className="font-bold text-sm">Criar divisão</h4>
      <p className="text-xs text-mld-muted">
        Escolha uma vista e marque dois pontos. A divisão mantém os dois lados da peça, sem criar
        tampas.
      </p>
      <div className="flex flex-wrap gap-1">
        {(['front', 'left', 'top'] as const).map((view, i) => (
          <Button
            key={view}
            disabled={!id}
            aria-label={`Dividir pela vista ${['frontal', 'lateral', 'de cima'][i]}`}
            className="px-2 text-xs"
            onClick={() => id && workshop.modelGuides.cut(id, view)}
          >
            {['Frente', 'Lado', 'Cima'][i]}
          </Button>
        ))}
      </div>
    </div>
  )
}

export function SceneModelGuideBar({ workshop }: { workshop: Workshop }) {
  const guide = workshop.modelGuides,
    owner = guide.owner
  if (!owner) return null
  return (
    <section
      className="flex min-h-12 flex-wrap items-center gap-1 border-t border-mld-border bg-mld-surface px-2"
      aria-label="Prévia da alteração"
    >
      <span role="status" className="min-w-0 flex-1 text-xs">
        {guide.error ??
          (owner.points.length < 2
            ? `Clique no ${owner.points.length + 1}º ponto da divisão.`
            : 'Confira o plano rosa e aplique a divisão.')}
      </span>
      {
        <>
          <Button
            className="px-2 text-xs"
            disabled={!owner.points.length}
            onClick={guide.correctPoint}
          >
            Corrigir ponto
          </Button>
          <Button className="px-2 text-xs" onClick={guide.centerCut}>
            Dividir no meio
          </Button>
        </>
      }
      <Button className="px-2 text-xs" onClick={guide.cancel}>
        Cancelar
      </Button>
      <Button
        variant="primary"
        className="px-2 text-xs"
        disabled={!owner.candidate || owner.candidate === owner.source || !!guide.error}
        onClick={guide.confirm}
      >
        Aplicar
      </Button>
    </section>
  )
}
