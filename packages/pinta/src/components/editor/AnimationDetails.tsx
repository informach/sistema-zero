/**
 * Detalhes da animação SELECIONADA (bloco "Animação selecionada", à direita da
 * prévia): Duração total, Velocidade (nome + o controle fino 🐢→🐇), Repetição
 * (Ligada/Desligada) e Suavização (Linear/Suave). Serve os dois estilos de
 * sprite. Só aparece para sprites animados.
 *
 * fps arrasta com `replace` (sem encher o undo); repetição/suavização são
 * um-toque e commitam (desfazíveis).
 */
import type { JSX } from 'react'
import { setAnimationEasing, setAnimationFps, setAnimationLoop } from '../../animation/frames'
import { animationDurationMs, FPS_CHOICES } from '../../animation/player'
import { activeAnimationOf } from '../../core/assetEdit'
import { COPY } from '../../core/copy'
import { isAnimatedSpriteKind } from '../../core/project'
import { useEditor, useEditorStores, useSession } from './editorContext'

function speedName(fps: number): string {
  if (fps <= 4) return COPY.animation.speedNames.slow
  if (fps <= 12) return COPY.animation.speedNames.normal
  return COPY.animation.speedNames.fast
}

/** ms → "0,6" (uma casa, vírgula decimal em PT). */
function formatSeconds(ms: number): string {
  return (ms / 1000).toFixed(1).replace('.', ',')
}

function Segmented({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: ReadonlyArray<{ value: string; label: string }>
  value: string
  onChange: (value: string) => void
}): JSX.Element {
  return (
    <fieldset
      aria-label={label}
      className="m-0 flex min-w-0 overflow-hidden rounded-lg border-2 border-pin-border p-0"
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`min-h-11 px-3 text-sm font-bold transition ${
              active ? 'bg-pin-accent text-pin-accent-fg' : 'text-pin-muted hover:bg-pin-border/40'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </fieldset>
  )
}

export function AnimationDetails(): JSX.Element | null {
  const { editor } = useEditorStores()
  const asset = useEditor((state) => state.asset)
  const animationId = useSession((state) => state.animationId)
  const frameIndex = useSession((state) => state.frameIndex)

  const animated = isAnimatedSpriteKind(asset) ? asset : null
  const animation = animated ? activeAnimationOf(animated, { animationId, frameIndex }) : null
  if (!animated || !animation) return null

  const activeId = animation.id
  const duration = animationDurationMs(animation.frames.length, animation.fps)
  const easing = animation.easing ?? 'linear'
  const fpsIndex = FPS_CHOICES.findIndex((f) => f >= animation.fps)
  const sliderValue = fpsIndex === -1 ? FPS_CHOICES.length - 1 : fpsIndex

  function updateFps(fps: number): void {
    const state = editor.getState()
    if (!isAnimatedSpriteKind(state.asset)) return
    // replace (sem undo): arrastar o slider não deve encher a história.
    state.replace(setAnimationFps(state.asset, activeId, fps))
  }
  function setLoop(loop: boolean): void {
    const state = editor.getState()
    if (!isAnimatedSpriteKind(state.asset)) return
    state.commit(setAnimationLoop(state.asset, activeId, loop))
  }
  function updateEasing(next: 'linear' | 'ease'): void {
    const state = editor.getState()
    if (!isAnimatedSpriteKind(state.asset)) return
    state.commit(setAnimationEasing(state.asset, activeId, next))
  }

  return (
    <section aria-label={COPY.animation.selected} className="pin-panel flex flex-col gap-3 p-3">
      <span className="text-sm font-bold text-pin-muted">{COPY.animation.selected}</span>

      <div className="flex items-center justify-between">
        <span className="text-sm text-pin-muted">{COPY.animation.duration}</span>
        <span className="text-sm font-bold text-pin-text">
          {COPY.animation.seconds(formatSeconds(duration))}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-sm text-pin-muted">{COPY.animation.speed}</span>
          <span className="text-sm font-bold text-pin-text">{speedName(animation.fps)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span aria-hidden="true" title={COPY.animation.slow}>
            🐢
          </span>
          <input
            type="range"
            min={0}
            max={FPS_CHOICES.length - 1}
            step={1}
            value={sliderValue}
            aria-label={COPY.animation.speed}
            aria-valuetext={`${animation.fps} quadros por segundo`}
            onChange={(event) => updateFps(FPS_CHOICES[Number(event.target.value)] ?? 8)}
            className="w-full accent-pin-accent"
          />
          <span aria-hidden="true" title={COPY.animation.fast}>
            🐇
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-pin-muted">{COPY.animation.repeatLabel}</span>
        <Segmented
          label={COPY.animation.repeatLabel}
          options={[
            { value: 'on', label: COPY.animation.repeatOn },
            { value: 'off', label: COPY.animation.repeatOff },
          ]}
          value={animation.loop ? 'on' : 'off'}
          onChange={(value) => setLoop(value === 'on')}
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-pin-muted">{COPY.animation.smoothing}</span>
        <Segmented
          label={COPY.animation.smoothing}
          options={[
            { value: 'linear', label: COPY.animation.smoothingLinear },
            { value: 'ease', label: COPY.animation.smoothingEase },
          ]}
          value={easing}
          onChange={(value) => updateEasing(value === 'ease' ? 'ease' : 'linear')}
        />
      </div>
    </section>
  )
}
