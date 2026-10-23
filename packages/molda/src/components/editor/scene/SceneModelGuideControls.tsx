import { evaluateSceneNodeFlags } from '../../../scene/evaluate'
import {
  clearScenePivotAxis,
  sceneLocalBounds,
  sceneNodePivot,
  setScenePivotPreset,
} from '../../../scene/pivot'
import { useMoldaToolAccess } from '../../toolAccess'
import { Button } from '../../ui/Button'
import { ArrowDownToLine, CircleDot, MousePointer2 } from '../../ui/icons'
import { ScenePieceCoordinates } from './ScenePieceCoordinates'
import type { useSceneWorkshop } from './useSceneWorkshop'

type Workshop = ReturnType<typeof useSceneWorkshop>

export function ScenePivotChoices({ workshop }: { workshop: Workshop }) {
  const { can } = useMoldaToolAccess()
  const id = workshop.selected.length === 1 ? workshop.selected[0] : null
  const node = id ? workshop.index.scene.nodes.get(id) : null,
    bounds = id ? sceneLocalBounds(workshop.document, id) : null,
    pivot = node ? sceneNodePivot(node) : null,
    locked = id ? evaluateSceneNodeFlags(workshop.index.scene).get(id)?.locked : true
  const disabled = !bounds || !id || locked
  const active = (preset: 'center' | 'bottom') => {
    if (!bounds || !pivot) return false
    const point = preset === 'center' ? bounds.center : bounds.base
    return point.every((n, i) => Math.abs(n - pivot[i]!) <= Math.max(...bounds.size) * 1e-10)
  }
  return (
    <section className="mld-pivot-controls space-y-3" aria-label="Onde a peça gira">
      <div className="space-y-1">
        <h3 className="text-sm font-bold">Onde a peça gira</h3>
        <p className="text-xs leading-relaxed text-mld-muted">
          Uma roda gira pelo meio. Uma porta gira pelo lado.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="mld-pivot-choice"
          disabled={disabled}
          aria-pressed={active('center')}
          onClick={() => choosePreset('center')}
        >
          <CircleDot aria-hidden="true" />
          No meio
        </button>
        <button
          type="button"
          className="mld-pivot-choice"
          disabled={disabled}
          aria-pressed={active('bottom')}
          onClick={() => choosePreset('bottom')}
        >
          <ArrowDownToLine aria-hidden="true" />
          Na base
        </button>
      </div>
      <button
        type="button"
        className="mld-pivot-choice w-full"
        disabled={disabled || node?.kind !== 'mesh'}
        aria-pressed={workshop.pivotSnap}
        onClick={() => changeSnap(!workshop.pivotSnap)}
      >
        <MousePointer2 aria-hidden="true" />
        Escolher na peça
      </button>
      <p role="status" className="text-xs leading-relaxed text-mld-muted">
        {workshop.pivotSnap
          ? 'Toque em um dos pontos destacados. Gire a câmera para alcançar o outro lado. Toque no botão de novo para cancelar.'
          : node?.kind === 'group'
            ? 'Para escolher um ponto, selecione uma peça do grupo.'
            : 'Arraste as alças para mudar o ponto de giro.'}
      </p>
      {node?.pivotAxis && id && (
        <div className="space-y-1">
          <p className="text-xs text-mld-muted">
            Eixo alinhado à face. Os próximos giros e poses usam essa direção.
          </p>
          <button
            type="button"
            className="mld-pivot-choice w-full"
            disabled={disabled}
            onClick={() => workshop.run((source) => clearScenePivotAxis(source, id))}
          >
            Voltar aos eixos da peça
          </button>
        </div>
      )}
      {workshop.mode === 'animation' && (
        <p className="text-xs text-mld-muted">As poses já gravadas continuam iguais.</p>
      )}
      {can('model.pivot') && (
        <details className="mld-disclosure">
          <summary>Ajuste fino</summary>
          <ScenePieceCoordinates workshop={workshop} onlyPivot />
          <label className="flex min-h-11 items-center gap-2">
            <input
              name="pivotVertical"
              type="checkbox"
              disabled={disabled}
              checked={workshop.pivotVertical}
              onChange={(event) => workshop.setPivotVertical(event.target.checked)}
            />
            Mover para cima e para baixo
          </label>
        </details>
      )}
    </section>
  )
  function choosePreset(preset: 'center' | 'bottom') {
    changeSnap(false)
    if (id) workshop.run((source) => setScenePivotPreset(source, id, preset))
  }
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
