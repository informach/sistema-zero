/**
 * A prévia RODANDO da animação selecionada (requisito-núcleo, layout
 * MakeCode): canvas pequeno tocando em loop ao lado do editor, play/pause e o
 * controle de velocidade 🐢→🐇 — o fps gravado é o MESMO que sai no export.
 *
 * O canvas pinta 1:1 e o upscale é CSS (`image-rendering: pixelated`), então
 * não há blit por frame — só quando o ÍNDICE do quadro muda.
 */
import type { JSX } from 'react'
import { useEffect, useRef } from 'react'
import { setAnimationFps, setAnimationLoop } from '../../animation/frames'
import { useAnimationPlayer } from '../../animation/player'
import { activeAnimationOf } from '../../core/assetEdit'
import { COPY } from '../../core/copy'
import { paintBitmap } from '../../pixel/render'
import { IconButton } from '../ui/Button'
import { useEditor, useEditorStores, useSession } from './editorContext'

export const FPS_CHOICES = [2, 4, 6, 8, 12, 16, 24] as const

export function PreviewPlayer(): JSX.Element | null {
  const { editor, session } = useEditorStores()
  const asset = useEditor((state) => state.asset)
  const animationId = useSession((state) => state.animationId)
  const frameIndex = useSession((state) => state.frameIndex)
  const playing = useSession((state) => state.playing)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const sprite = asset.kind === 'pixel-sprite' ? asset : null
  const animation = sprite ? activeAnimationOf(sprite, { animationId, frameIndex }) : null

  const playingIndex = useAnimationPlayer({
    playing: playing && Boolean(animation),
    fps: animation?.fps ?? 8,
    frameCount: animation?.frames.length ?? 0,
    loop: animation?.loop ?? true,
  })

  // Pausado mostra o quadro EM EDIÇÃO (a criança vê o que está pintando).
  const shownIndex = playing
    ? playingIndex
    : Math.min(frameIndex, (animation?.frames.length ?? 1) - 1)
  const shown = animation?.frames[shownIndex] ?? null

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas && shown && sprite) paintBitmap(canvas, shown, sprite.paletteId)
  }, [shown, sprite])

  if (!sprite || !animation) return null

  const fpsIndex = FPS_CHOICES.findIndex((f) => f >= animation.fps)
  const sliderValue = fpsIndex === -1 ? FPS_CHOICES.length - 1 : fpsIndex

  return (
    <section
      aria-label={COPY.animation.preview}
      className="flex flex-col items-center gap-2 rounded-3xl border-2 border-pin-border bg-pin-surface p-3"
    >
      <span className="text-sm font-bold text-pin-muted">{COPY.animation.preview}</span>
      <div className="pin-checkerboard rounded-xl border-2 border-pin-border p-1">
        <canvas
          ref={canvasRef}
          className="pin-pixelated block h-24 w-24 object-contain"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>
      <div className="flex items-center gap-1">
        <IconButton
          aria-label={playing ? COPY.animation.pause : COPY.animation.play}
          title={playing ? COPY.animation.pause : COPY.animation.play}
          onClick={() => session.getState().setPlaying(!playing)}
        >
          <span aria-hidden="true">{playing ? '⏸️' : '▶️'}</span>
        </IconButton>
        <IconButton
          active={animation.loop}
          aria-label={COPY.animation.loop}
          aria-pressed={animation.loop}
          title={COPY.animation.loop}
          onClick={() => {
            const state = editor.getState()
            if (state.asset.kind !== 'pixel-sprite') return
            state.replace(setAnimationLoop(state.asset, animation.id, !animation.loop))
          }}
        >
          <span aria-hidden="true">🔁</span>
        </IconButton>
      </div>
      <div className="flex w-full items-center gap-2 px-1">
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
          onChange={(event) => {
            const fps = FPS_CHOICES[Number(event.target.value)] ?? 8
            const state = editor.getState()
            if (state.asset.kind !== 'pixel-sprite') return
            // replace (sem undo): arrastar o slider não deve encher a história.
            state.replace(setAnimationFps(state.asset, animation.id, fps))
          }}
          className="w-full accent-pin-accent"
        />
        <span aria-hidden="true" title={COPY.animation.fast}>
          🐇
        </span>
      </div>
    </section>
  )
}
