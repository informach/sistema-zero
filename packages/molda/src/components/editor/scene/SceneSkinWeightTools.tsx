import { lazy, Suspense, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import { useMoldaToolAccess } from '../../toolAccess'
import { Button } from '../../ui/Button'
import type { SceneSkinWeightEditorProps } from './SceneSkinWeightEditor'

const SceneSkinWeightEditor = lazy(() =>
  import('./SceneSkinWeightEditor').then((module) => ({ default: module.SceneSkinWeightEditor })),
)

export interface SceneSkinSmoothResult {
  changed: number
  precision: number
}

/** A força dos ossos nos pontos escolhidos (`model.skin`, profissional). */
export function SceneSkinWeightTools({
  onSmooth,
  ...props
}: SceneSkinWeightEditorProps & {
  /** "Suavizar forças" nos pontos escolhidos; `null` quando a criação mudou no meio. */
  onSmooth(): SceneSkinSmoothResult | null
}) {
  const [open, setOpen] = useState(false),
    // A mensagem mora aqui, fora do rascunho: suavizar muda os pesos e o rascunho recomeça.
    [smoothed, setSmoothed] = useState<SceneSkinSmoothResult | 'changed' | null>(null),
    summary = useRef<HTMLElement>(null),
    copy = COPY.scene.skinWeights
  if (!useMoldaToolAccess().can('model.skin')) return null
  return (
    <details
      className="rounded-xl border border-mld-border p-2"
      onToggle={(event) => {
        setOpen(event.currentTarget.open)
        setSmoothed(null)
      }}
    >
      <summary ref={summary} className="min-h-11 cursor-pointer py-3 text-sm font-bold">
        {copy.title}
      </summary>
      {open && (
        <Suspense fallback={<p role="status">{COPY.scene.appearanceLoading}</p>}>
          <SceneSkinWeightEditor
            key={JSON.stringify([props.sourceKey, props.vertexIds])}
            {...props}
            onApply={(mix) => {
              const applied = props.onApply(mix)
              if (applied) summary.current?.focus()
              return applied
            }}
          />
        </Suspense>
      )}
      {open && props.vertexIds.length > 0 && (
        <section
          aria-label={copy.smooth}
          className="mt-3 space-y-2 border-t border-mld-border pt-3"
        >
          <p className="text-xs text-mld-muted">{copy.smoothHint}</p>
          <Button
            className="w-full text-sm"
            disabled={props.disabled}
            onClick={() => setSmoothed(onSmooth() ?? 'changed')}
          >
            {copy.smooth}
          </Button>
          <div role="status" className="text-sm text-mld-muted">
            {smoothed === 'changed'
              ? copy.changed
              : smoothed && (
                  <>
                    {copy.smoothed(smoothed.changed)}
                    {smoothed.precision > 0 && ` ${copy.smoothPrecision(smoothed.precision)}`}
                  </>
                )}
          </div>
        </section>
      )}
    </details>
  )
}
