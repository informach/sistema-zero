/**
 * A prévia RODANDO da animação selecionada (requisito-núcleo, layout MakeCode):
 * a animação toca ao lado do editor, com os botões grandes **Reproduzir**
 * (assistir rodando) e **Editar** (parar no quadro atual para desenhar). Serve
 * os DOIS estilos: pixel pinta num canvas (upscale CSS pixelated), vetor
 * renderiza o quadro como SVG inline (síncrono, sem canvas).
 *
 * Os controles de velocidade/repetição/suavização e a duração vivem no
 * `AnimationDetails` (bloco "Animação selecionada", logo abaixo).
 */
import type { JSX } from 'react'
import { useEffect, useRef } from 'react'
import { useAnimationPlayer } from '../../animation/player'
import { activeAnimationOf } from '../../core/assetEdit'
import { COPY } from '../../core/copy'
import {
  isAnimatedSpriteKind,
  type PintaBitmap,
  resolveAssetPalette,
  type VectorFrame,
} from '../../core/project'
import { paintBitmap } from '../../pixel/render'
import { VectorFrameSvg } from '../../vector/VectorFrameSvg'
import { Button } from '../ui/Button'
import { useEditor, useEditorStores, useSession } from './editorContext'

export function PreviewPlayer(): JSX.Element | null {
  const { session } = useEditorStores()
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
    easing: animation?.easing,
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
      paintBitmap(canvas, shownBitmap, resolveAssetPalette(animated))
    }
  }, [shownBitmap, animated])

  if (!animated || !animation) return null

  return (
    <section
      aria-label={COPY.animation.preview}
      className="pin-panel flex flex-col items-center gap-2 p-3"
    >
      <span className="self-start text-sm font-bold text-pin-muted">{COPY.animation.preview}</span>
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
      <span className="flex max-w-full flex-wrap items-center justify-center gap-1.5 text-center text-sm font-bold text-pin-text">
        <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-pin-accent" />
        <span className="min-w-0 max-w-full truncate">{animation.name}</span>
        <span className="font-normal text-pin-muted">{COPY.animation.selectedBadge}</span>
      </span>
      <div className="flex w-full gap-2">
        <Button
          variant={playing ? 'primary' : 'outline'}
          className="flex-1"
          aria-pressed={playing}
          onClick={() => session.getState().setPlaying(true)}
        >
          {COPY.animation.reproduce}
        </Button>
        <Button
          variant={playing ? 'outline' : 'primary'}
          className="flex-1"
          aria-pressed={!playing}
          onClick={() => session.getState().setPlaying(false)}
        >
          {COPY.animation.edit}
        </Button>
      </div>
    </section>
  )
}
