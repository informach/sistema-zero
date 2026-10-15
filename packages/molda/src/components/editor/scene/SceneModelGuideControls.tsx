import { Button } from '../../ui/Button'
import type { useSceneWorkshop } from './useSceneWorkshop'

type Workshop = ReturnType<typeof useSceneWorkshop>

export function ScenePivotChoices({ workshop }: { workshop: Workshop }) {
  const id = workshop.selected.length === 1 ? workshop.selected[0] : null
  return (
    <div className="space-y-2">
      <p className="text-sm text-mld-muted">
        Escolha onde a peça vai girar. O desenho rosa mostra uma volta de exemplo.
      </p>
      <div className="flex flex-wrap gap-1">
        <Button disabled={!id} onClick={() => id && workshop.modelGuides.preset(id, 'center')}>
          Centro
        </Button>
        <Button disabled={!id} onClick={() => id && workshop.modelGuides.preset(id, 'bottom')}>
          Embaixo
        </Button>
        <Button disabled={!id} onClick={() => id && workshop.modelGuides.corners(id)}>
          Canto
        </Button>
      </div>
      {workshop.modelGuides.owner?.pickingCorners && (
        <p role="status" className="text-sm">
          Clique em um ponto rosa no modelo.
        </p>
      )}
      {workshop.modelGuides.error && (
        <p role="alert" className="text-sm text-mld-danger">
          {workshop.modelGuides.error}
        </p>
      )}
    </div>
  )
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
          (owner.kind === 'cut'
            ? owner.points.length < 2
              ? `Clique no ${owner.points.length + 1}º ponto da divisão.`
              : 'Confira o plano rosa e aplique a divisão.'
            : 'Confira o ponto rosa e o giro de exemplo.')}
      </span>
      {owner.kind === 'cut' && (
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
      )}
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
