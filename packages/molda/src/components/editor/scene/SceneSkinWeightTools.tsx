import { lazy, Suspense, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import type { SceneSkinWeightEditorProps } from './SceneSkinWeightEditor'

const SceneSkinWeightEditor = lazy(() =>
  import('./SceneSkinWeightEditor').then((module) => ({ default: module.SceneSkinWeightEditor })),
)

export function SceneSkinWeightTools(props: SceneSkinWeightEditorProps) {
  const [open, setOpen] = useState(false),
    summary = useRef<HTMLElement>(null)
  return (
    <details
      className="rounded-xl border border-mld-border p-2"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary ref={summary} className="min-h-11 cursor-pointer py-3 text-sm font-bold">
        {COPY.scene.skinWeights.title}
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
    </details>
  )
}
