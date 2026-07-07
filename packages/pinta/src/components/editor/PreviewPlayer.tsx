/**
 * A prévia RODANDO da animação selecionada (requisito-núcleo, layout
 * MakeCode): tocando em loop ao lado do editor, play/pause e o controle de
 * velocidade 🐢→🐇 — o fps gravado é o MESMO que sai no export. Serve os DOIS
 * estilos: pixel pinta num canvas (upscale CSS pixelated), vetor renderiza o
 * quadro como SVG inline (síncrono, sem canvas).
 */
import type { JSX } from 'react'
import { useEffect, useRef } from 'react'
import { setAnimationFps, setAnimationLoop } from '../../animation/frames'
import { useAnimationPlayer } from '../../animation/player'
import { activeAnimationOf } from '../../core/assetEdit'
import { COPY } from '../../core/copy'
import { isAnimatedSpriteKind, type PintaBitmap, type VectorFrame } from '../../core/project'
import { paintBitmap } from '../../pixel/render'
import { VectorFrameSvg } from '../../vector/VectorFrameSvg'
import { ToolButton } from '../ui/Button'
import { Pause, Play, Repeat } from '../ui/icons'
import { useEditor, useEditorStores, useSession } from './editorContext'

export const FPS_CHOICES = [2, 4, 6, 8, 12, 16, 24] as const

export function PreviewPlayer(): JSX.Element | null {
  const { editor, session } = useEditorStores()
  const asset = useEditor((state) => state.asset)
  const animationId = useSession((state) => state.animationId)
  const frameIndex = useSession((state) => state.frameIndex)
  const playing = useSession((state) => state.playing)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const animated = isAnimatedSpriteKind(asset) ? asset : null
  const animation = animated ? activeAnimationOf(animated, { animationId, frameIndex }) : null

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
  const shownBitmap = animated?.kind === 'pixel-sprite' && shown ? (shown as PintaBitmap) : null
  const shownShapes = animated?.kind === 'vector-sprite' && shown ? (shown as VectorFrame) : null

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas && shownBitmap && animated?.kind === 'pixel-sprite') {
      paintBitmap(canvas, shownBitmap, animated.paletteId)
    }
  }, [shownBitmap, animated])

  if (!animated || !animation) return null

  const fpsIndex = FPS_CHOICES.findIndex((f) => f >= animation.fps)
  const sliderValue = fpsIndex === -1 ? FPS_CHOICES.length - 1 : fpsIndex

  return (
    <section
      aria-label={COPY.animation.preview}
      className="pin-panel flex flex-col items-center gap-2 p-3"
    >
      <span className="text-sm font-bold text-pin-muted">{COPY.animation.preview}</span>
      <div className="pin-checkerboard rounded-xl border-2 border-pin-border p-1">
        {animated.kind === 'pixel-sprite' ? (
          <canvas
            ref={canvasRef}
            className="pin-pixelated block h-24 w-24 object-contain"
            style={{ imageRendering: 'pixelated' }}
          />
        ) : (
          <VectorFrameSvg
            width={animated.frameWidth}
            height={animated.frameHeight}
            shapes={shownShapes ?? []}
            className="block h-24 w-24"
          />
        )}
      </div>
      <div className="flex items-center gap-1">
        <ToolButton
          icon={playing ? Pause : Play}
          label={playing ? COPY.animation.pause : COPY.animation.play}
          onClick={() => session.getState().setPlaying(!playing)}
        />
        <ToolButton
          icon={Repeat}
          label={COPY.animation.loop}
          active={animation.loop}
          onClick={() => {
            const state = editor.getState()
            if (!isAnimatedSpriteKind(state.asset)) return
            state.replace(setAnimationLoop(state.asset, animation.id, !animation.loop))
          }}
        />
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
            if (!isAnimatedSpriteKind(state.asset)) return
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
