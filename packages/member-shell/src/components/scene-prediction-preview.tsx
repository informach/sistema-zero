'use client'

import { type SceneActivity, scenePredictionPreview } from '@sistemazero/core/learning/scene'
import { Ear } from 'lucide-react'
import { useId } from 'react'
import { ExplorationStage, SceneButton } from './exploration-stage'

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
  const noteId = useId()
  const ariaLabel = control
    ? `Prévia da experiência: ${contextLabel}. Controle mostrado: ${control.label}. ${control.note}`
    : `Prévia da experiência: ${contextLabel}`
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      data-slot="scene-prediction-preview"
      data-scene-prediction-preview
      data-testid="scene-prediction-preview"
      className="w-full overflow-hidden rounded-2xl border border-border"
    >
      <div
        role="img"
        aria-label={`Cena inicial da experiência: ${contextLabel}`}
        data-preview-stage
        className="[&_.sz-scene-frame]:rounded-none [&_.sz-scene-frame]:border-0 [&_button]:hidden [&_input]:hidden [&_select]:hidden [&_textarea]:hidden [&_[role=button]]:hidden [&_[role=slider]]:hidden"
      >
        <ExplorationStage activity={activity} state={state} preview={preview} />
      </div>
      {control && (
        <div
          data-preview-control
          className="m-3 flex flex-col items-start gap-2 rounded-2xl border border-border p-4"
        >
          <SceneButton tom="gesto" disabled aria-describedby={noteId}>
            <Ear size={16} />
            {control.label}
          </SceneButton>
          <p id={noteId} className="text-xs text-muted-foreground">
            {control.note}
          </p>
        </div>
      )}
    </div>
  )
}
