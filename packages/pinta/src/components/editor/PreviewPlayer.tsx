/**
 * A prévia RODANDO da animação selecionada (requisito-núcleo, layout MakeCode):
 * a animação toca ao lado do editor, com os botões grandes **Reproduzir**
 * (assistir rodando) e **Editar** (parar no quadro atual para desenhar). Serve
 * os DOIS estilos: pixel pinta num canvas (upscale CSS pixelated), vetor
 * renderiza o quadro como SVG inline (síncrono, sem canvas).
 *
 * Ações em BOTÕES DE ÍCONE (tooltip = title do ToolButton): Reproduzir (play),
 * Editar (parar no quadro atual para desenhar) e Configurações — este abre a
 * MODAL "Animação selecionada" (`AnimationDetails` dentro de um Dialog, como o
 * seletor de cor da paleta): o dia a dia usa os defaults, ajustar é um desvio
 * explícito.
 *
 * Com `disclosure` (coluna do vetor), o painel RECOLHIDO mostra uma miniatura
 * VIVA do quadro no cabeçalho (`collapsedActions` do `Panel`) e o loop NÃO
 * pausa: o accordion por medida recolhe a Prévia sozinho em telas de 768px, e
 * sem a miniatura a animação sumia e parava sem aviso (full review 04/09/2026).
 */
import type { JSX } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useAnimationPlayer } from '../../animation/player'
import { activeAnimationOf } from '../../core/assetEdit'
import { COPY } from '../../core/copy'
import { isInteractiveControlTarget } from '../../core/dom'
import {
  isAnimatedSpriteKind,
  type PintaPixelFrame,
  resolveAssetPalette,
  type VectorFrame,
} from '../../core/project'
import { shortcut } from '../../core/shortcuts'
import { flattenCelsOrBlank } from '../../pixel/layers'
import { paintBitmap } from '../../pixel/render'
import { VectorFrameSvg } from '../../vector/VectorFrameSvg'
import { ToolButton } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Play, Settings, SquarePen } from '../ui/icons'
import { Panel, type PanelDisclosure } from '../ui/Panel'
import { AnimationDetails } from './AnimationDetails'
import { useEditor, useEditorStores, useSession } from './editorContext'
import { useActionShortcuts } from './useActionShortcuts'

export function PreviewPlayer({
  disclosure,
}: {
  disclosure?: PanelDisclosure
} = {}): JSX.Element | null {
  const { session } = useEditorStores()
  const asset = useEditor((state) => state.asset)
  const animationId = useSession((state) => state.animationId)
  const frameIndex = useSession((state) => state.frameIndex)
  const playing = useSession((state) => state.playing)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const miniCanvasRef = useRef<HTMLCanvasElement>(null)
  // RECOLHIDA (accordion da coluna do vetor), a Prévia vira uma MINIATURA VIVA
  // no próprio cabeçalho: em 768px ela nasce recolhida (só um painel cabe), e
  // a criança precisa continuar vendo o personagem mexer.
  const collapsed = disclosure ? !disclosure.open : false

  const animated = isAnimatedSpriteKind(asset) ? asset : null
  const animation = animated ? activeAnimationOf(animated, { animationId, frameIndex }) : null

  // Enter = reproduzir/pausar a prévia (Aseprite). Não em cima de botão/campo: ali
  // o Enter é o clique deles.
  useActionShortcuts([
    {
      combo: shortcut('playPause'),
      when: (event) => animated !== null && !isInteractiveControlTarget(event.target),
      run: () => {
        const s = session.getState()
        s.setPlaying(!s.playing)
      },
    },
  ])

  // O loop segue com o painel recolhido: a miniatura do cabeçalho é quem mostra.
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
  // A prévia mostra o desenho VISÍVEL: camadas achatadas.
  const shownBitmap =
    animated?.kind === 'pixel-sprite' && shown
      ? flattenCelsOrBlank(shown as PintaPixelFrame, animated.layers)
      : null
  const shownShapes = animated?.kind === 'vector-sprite' && shown ? (shown as VectorFrame) : null

  useEffect(() => {
    // Recolhido só existe a miniatura; aberto, só o canvas grande.
    const canvas = (collapsed ? miniCanvasRef : canvasRef).current
    if (canvas && shownBitmap && animated?.kind === 'pixel-sprite') {
      paintBitmap(canvas, shownBitmap, resolveAssetPalette(animated))
    }
  }, [shownBitmap, animated, collapsed])

  if (!animated || !animation) return null

  const mini = (
    <span
      aria-hidden="true"
      className="pin-checkerboard flex size-9 shrink-0 items-center justify-center rounded-lg border-2 border-pin-border p-0.5"
    >
      {animated.kind === 'pixel-sprite' ? (
        <canvas
          ref={miniCanvasRef}
          className="pin-pixelated block size-7 object-contain"
          style={{ imageRendering: 'pixelated' }}
        />
      ) : (
        <VectorFrameSvg
          width={animated.frameWidth}
          height={animated.frameHeight}
          shapes={shownShapes ?? []}
          className="block size-7"
        />
      )}
    </span>
  )

  return (
    <Panel
      title={COPY.animation.preview}
      disclosure={disclosure}
      collapsedActions={mini}
      bodyClassName="flex flex-col items-center gap-2 p-2"
    >
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
      <div className="flex w-full items-center justify-center gap-2">
        <ToolButton
          icon={Play}
          label={COPY.animation.reproduce}
          active={playing}
          onClick={() => session.getState().setPlaying(true)}
        />
        <ToolButton
          icon={SquarePen}
          label={COPY.animation.edit}
          active={!playing}
          onClick={() => session.getState().setPlaying(false)}
        />
        <ToolButton
          icon={Settings}
          label={COPY.animation.settings}
          aria-haspopup="dialog"
          aria-expanded={settingsOpen}
          onClick={() => setSettingsOpen(true)}
        />
      </div>

      <Dialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title={COPY.animation.selected}
      >
        <AnimationDetails />
      </Dialog>
    </Panel>
  )
}
