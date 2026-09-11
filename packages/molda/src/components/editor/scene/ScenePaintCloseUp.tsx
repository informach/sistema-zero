/**
 * Pintar de perto: SÓ a face tocada, ampliada e em pé, por cima do palco. As ferramentas e as
 * cores são as mesmas da aba (a coluna e a faixa continuam à vista), e o traço fica preso à
 * região da face (o limite vai em cada amostra).
 *
 * É diferente da folha inteira ("Mais jeitos de pintar"), que mostra a imagem toda, confusa
 * para a criança: aqui é uma face só, do tamanho do palco, do jeito que ela aparece de fora
 * (`scene/paintFaceView.ts`), e não do jeito que a folha a guarda.
 */
import { useEffect, useLayoutEffect, useRef } from 'react'
import { SCENE_PAINT_COPY } from '../../../core/scenePaintCopy'
import type { Texel } from '../../../paint/skinPaint'
import { compositeSceneImageRegion, type SceneRgba } from '../../../scene/composite'
import type { SceneImage } from '../../../scene/document'
import {
  type ScenePaintFaceView,
  sceneFaceViewSize,
  sceneFaceViewTexel,
} from '../../../scene/paintFaceView'
import { Button } from '../../ui/Button'
import { SCENE_CLOSE_UP_REGION, type ScenePaintActions } from './useScenePaint'

export function ScenePaintCloseUp({
  image,
  palette,
  base,
  view,
  drawing,
  actions,
  onClose,
}: {
  image: SceneImage
  palette: readonly SceneRgba[]
  base: SceneRgba
  view: ScenePaintFaceView
  drawing: boolean
  actions: ScenePaintActions
  onClose(): void
}) {
  const { region } = view
  const { width, height } = sceneFaceViewSize(view)
  const canvas = useRef<HTMLCanvasElement>(null)
  const root = useRef<HTMLElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const pointer = useRef<number | null>(null)
  const live = useRef(actions)
  live.current = actions
  useEffect(() => {
    const context = canvas.current?.getContext('2d')
    if (!context) return
    const pixels = compositeSceneImageRegion(image, palette, base, view.region)
    const stride = view.region.x1 - view.region.x0 + 1
    const data = context.createImageData(width, height)
    // Cada célula da tela puxa o texel dela: a face em pé, com a linha de cima em cima.
    for (let row = 0; row < height; row++)
      for (let column = 0; column < width; column++) {
        const [x, y] = sceneFaceViewTexel(view, column, row)
        const from = ((y - view.region.y0) * stride + (x - view.region.x0)) * 4
        data.data.set(pixels.subarray(from, from + 4), (row * width + column) * 4)
      }
    context.putImageData(data, 0, 0)
  }, [image, palette, base, view, width, height])
  useEffect(() => {
    if (!drawing && pointer.current !== null) {
      pointer.current = null
      live.current.end(false)
    }
  }, [drawing])
  useEffect(
    () => () => {
      if (pointer.current !== null) live.current.end(false)
    },
    [],
  )
  // Abrir leva o foco ao título (o leitor anuncia onde a criança está); fechar devolve o foco à
  // ferramenta "Pintar de perto". Sem isso o botão "Voltar ao modelo" sumia com o foco, que caía
  // no body, e os atalhos (P, E, Ctrl+Z, Esc) paravam até o próximo clique.
  useLayoutEffect(() => {
    const section = root.current
    heading.current?.focus({ preventScroll: true })
    return () => {
      const active = window.document.activeElement
      if (active && active !== window.document.body && !section?.contains(active)) return
      section
        ?.closest('[data-molda-theme]')
        ?.querySelector<HTMLElement>('[data-paint-tool="paint.closeup"]')
        ?.focus({ preventScroll: true })
    }
  }, [])
  /** O texel sob o dedo, contando a margem do `object-contain` quando a face não tem o formato do palco. */
  function texel(clientX: number, clientY: number): Texel | null {
    const box = canvas.current?.getBoundingClientRect()
    if (!box?.width || !box.height) return null
    const scale = Math.min(box.width / width, box.height / height)
    const left = box.left + (box.width - width * scale) / 2
    const top = box.top + (box.height - height * scale) / 2
    const across = (clientX - left) / (width * scale)
    const down = (clientY - top) / (height * scale)
    if (across < 0 || down < 0 || across > 1 || down > 1) return null
    return sceneFaceViewTexel(
      view,
      Math.min(width - 1, Math.floor(across * width)),
      Math.min(height - 1, Math.floor(down * height)),
    )
  }
  const sample = (point: Texel) => ({ point, region: SCENE_CLOSE_UP_REGION, bounds: region })
  function finish(commit: boolean) {
    const id = pointer.current
    pointer.current = null
    if (id === null) return
    if (canvas.current?.hasPointerCapture?.(id)) canvas.current.releasePointerCapture(id)
    live.current.end(commit)
  }
  return (
    <section
      ref={root}
      aria-label={SCENE_PAINT_COPY.closeUp}
      className="absolute inset-0 z-30 flex flex-col gap-2 bg-mld-bg p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 ref={heading} tabIndex={-1} className="mld-display text-lg outline-none">
          {SCENE_PAINT_COPY.closeUp}
        </h2>
        <Button className="text-sm" onClick={onClose}>
          {SCENE_PAINT_COPY.closeUpBack}
        </Button>
      </div>
      <canvas
        ref={canvas}
        width={width}
        height={height}
        role="img"
        aria-label={SCENE_PAINT_COPY.closeUpSheet}
        className="mld-pixelated min-h-0 w-full flex-1 touch-none rounded-lg object-contain"
        onPointerDown={(event) => {
          if (pointer.current !== null || event.button !== 0) return
          const point = texel(event.clientX, event.clientY)
          if (!point || !actions.begin(sample(point))) return
          event.preventDefault()
          pointer.current = event.pointerId
          try {
            event.currentTarget.setPointerCapture(event.pointerId)
          } catch {
            finish(false)
          }
        }}
        onPointerMove={(event) => {
          if (pointer.current !== event.pointerId) return
          const point = texel(event.clientX, event.clientY)
          actions.move(point ? sample(point) : null)
        }}
        onPointerUp={(event) => {
          if (pointer.current !== event.pointerId) return
          const point = texel(event.clientX, event.clientY)
          if (point) actions.move(sample(point))
          finish(true)
        }}
        onPointerCancel={(event) => {
          if (pointer.current === event.pointerId) finish(false)
        }}
      />
    </section>
  )
}
