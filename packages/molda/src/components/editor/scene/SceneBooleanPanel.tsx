import type { SceneBooleanOperation } from '../../../scene/booleanSolids'
import type { MoldaSceneDocument } from '../../../scene/document'
import { Button } from '../../ui/Button'

export interface SceneBooleanPreview {
  source: MoldaSceneDocument
  result: MoldaSceneDocument
  ids: readonly [string, string]
  operation: SceneBooleanOperation
}

const operations: readonly { id: SceneBooleanOperation; label: string; help: string }[] = [
  { id: 'union', label: 'União', help: 'Junta os volumes das duas peças.' },
  { id: 'intersection', label: 'Interseção', help: 'Mantém somente o volume comum.' },
  { id: 'difference', label: 'Diferença', help: 'Retira a segunda peça da primeira.' },
]

export function SceneBooleanPanel({
  names,
  preview,
  busy,
  prepare,
  confirm,
  cancel,
}: {
  names: readonly [string, string]
  preview: SceneBooleanPreview | null
  busy: boolean
  prepare(operation: SceneBooleanOperation): void
  confirm(): void
  cancel(): void
}) {
  return (
    <section
      aria-label="Combinar volumes"
      className="rounded-xl border border-mld-border bg-mld-surface p-3"
    >
      <h3 className="mld-kicker">Combinar volumes</h3>
      <p className="mt-2 text-sm text-mld-muted">
        Base: <strong>{names[0]}</strong>. Segunda peça: <strong>{names[1]}</strong>. A diferença
        retira a segunda da base.
      </p>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {operations.map(({ id, label, help }) => (
          <button
            key={id}
            type="button"
            className="mld-chip-btn justify-center"
            aria-pressed={preview?.operation === id}
            disabled={busy}
            title={help}
            onClick={() => prepare(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {busy && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <p role="status" className="text-sm text-mld-muted">
            Calculando prévia…
          </p>
          <Button variant="outline" onClick={cancel}>
            Cancelar
          </Button>
        </div>
      )}
      {preview && (
        <div className="mt-3 space-y-2 border-t border-mld-border pt-3">
          <p role="status" className="text-sm text-mld-text">
            Prévia no palco. Confirme para substituir as duas peças pelo resultado.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={confirm}>Confirmar resultado</Button>
            <Button variant="outline" onClick={cancel}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
