import { useMoldaToolAccess } from '../../toolAccess'
import { Check, Slice, Undo2 } from '../../ui/icons'
import { SceneCutPrecision } from './SceneCutPrecision'
import type { useSceneWorkshop } from './useSceneWorkshop'

export function SceneSolidCutBar({ workshop }: { workshop: ReturnType<typeof useSceneWorkshop> }) {
  const { can } = useMoldaToolAccess()
  if (workshop.tool !== 'cut' || !can('model.cut')) return null
  const cut = workshop.solidCut
  return (
    <section data-molda-theme="dark" className="mld-cut-bar" aria-label="Separar a peça">
      <Slice aria-hidden="true" className="size-5 shrink-0 text-[var(--mld-cut-ink)]" />
      <span className="mld-cut-status" role={cut.error ? 'alert' : 'status'}>
        {cut.error ??
          (cut.busy
            ? 'Fechando as duas peças…'
            : !cut.owner
              ? 'Escolha uma peça para cortar'
              : cut.owner.numericPlane
                ? 'Veja onde a peça será separada'
                : 'Clique nas bordas para marcar o corte')}
      </span>
      {!cut.owner?.numericPlane && (
        <label title="Ligado, cada ponto fica exatamente no meio da aresta. Desligado, escolha qualquer posição nela.">
          <input
            type="checkbox"
            name="cutMidpoint"
            className="mld-cut-switch"
            checked={cut.midpoint}
            disabled={cut.busy}
            onChange={(event) => cut.setMidpoint(event.target.checked)}
          />
          Grudar no meio
        </label>
      )}
      {can('model.precise') && <SceneCutPrecision cut={cut} />}
      <button
        type="button"
        aria-label="Corrigir ponto"
        title="Corrigir ponto"
        disabled={!cut.owner?.points.length || cut.busy}
        onClick={cut.back}
      >
        <Undo2 aria-hidden="true" className="size-4" />
      </button>
      <button type="button" onClick={() => workshop.setTool('select')}>
        Cancelar
      </button>
      <button
        type="button"
        data-confirm=""
        disabled={!cut.canConfirm}
        onClick={() => void cut.confirm()}
      >
        <Check aria-hidden="true" className="size-4" />
        Separar
      </button>
    </section>
  )
}
