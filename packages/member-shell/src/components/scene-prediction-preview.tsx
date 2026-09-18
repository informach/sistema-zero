'use client'

import { type SceneActivity, scenePredictionPreview } from '@sistemazero/core/learning/scene'
import { Ear } from 'lucide-react'
import { ExplorationStage } from './exploration-stage'

export interface ScenePredictionPreviewProps {
  activity: SceneActivity
  /** O nome curto que apresenta para a criança o que ela verá no palco. */
  contextLabel: string
}

/**
 * O retrato inicial e não interativo da mesma cena que abrirá depois do palpite.
 *
 * Algumas cenas desenham seus comandos como parte do próprio palco. Nesta leitura eles também
 * somem visualmente: antes do palpite há uma imagem para observar, não uma bancada para tentar usar.
 */
export function ScenePredictionPreview({ activity, contextLabel }: ScenePredictionPreviewProps) {
  const { preview, state } = scenePredictionPreview(activity)
  const control = preview.control
  const ariaLabel = control
    ? `Prévia da experiência: ${contextLabel}. Controle mostrado: ${control.label}. ${control.note}`
    : `Prévia da experiência: ${contextLabel}`
  return (
    <div
      role="img"
      aria-label={ariaLabel}
      data-slot="scene-prediction-preview"
      data-scene-prediction-preview
      data-testid="scene-prediction-preview"
      className="w-full overflow-hidden rounded-2xl border border-border [&_.sz-scene-frame]:rounded-none [&_.sz-scene-frame]:border-0 [&_button]:hidden [&_input]:hidden [&_select]:hidden [&_textarea]:hidden [&_[role=button]]:hidden [&_[role=slider]]:hidden"
    >
      <ExplorationStage activity={activity} state={state} preview={preview} />
      {control && (
        <div
          aria-hidden
          data-preview-control
          className="m-3 flex min-h-11 items-center gap-3 rounded-xl border border-primary/40 bg-primary/10 px-4 py-2 text-primary"
        >
          <Ear size={18} aria-hidden />
          <span className="min-w-0">
            <span className="block text-sm font-bold">{control.label}</span>
            <span className="block text-xs text-muted-foreground">{control.note}</span>
          </span>
        </div>
      )}
    </div>
  )
}
