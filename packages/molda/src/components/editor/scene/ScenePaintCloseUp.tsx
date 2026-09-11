/**
 * Pintar de perto: a folha mostrando SÓ a face tocada, ampliada, por cima do palco. As
 * ferramentas e as cores são as mesmas da aba (a coluna e a faixa continuam à vista), e o
 * traço fica preso à região da face (o limite vai em cada amostra).
 *
 * É diferente da folha inteira ("Mais jeitos de pintar"), que mostra a imagem toda, confusa
 * para a criança: aqui é uma face só, do tamanho do palco.
 */
import { useEffect, useRef } from 'react'
import { SCENE_PAINT_COPY } from '../../../core/scenePaintCopy'
import type { Texel } from '../../../paint/skinPaint'
import {
  compositeSceneImageRegion,
  type ScenePixelRegion,
  type SceneRgba,
} from '../../../scene/composite'
import type { SceneImage } from '../../../scene/document'
import { Button } from '../../ui/Button'
import type { ScenePaintActions } from './useScenePaint'

export function ScenePaintCloseUp({
  image,
  palette,
  base,
  region,
  drawing,
  actions,
  onClose,
}: {
  image: SceneImage
  palette: readonly SceneRgba[]
  base: SceneRgba
  region: ScenePixelRegion
  drawing: boolean
  actions: ScenePaintActions
  onClose(): void
}) {
  const width = region.x1 - region.x0 + 1
  const height = region.y1 - region.y0 + 1
  const canvas = useRef<HTMLCanvasElement>(null)
  const pointer = useRef<number | null>(null)
  const live = useRef(actions)
  live.current = actions
  useEffect(() => {
    const context = canvas.current?.getContext('2d')
    if (!context) return
    const pixels = compositeSceneImageRegion(image, palette, base, region)
    const data = context.createImageData(width, height)
    // Linha zero da folha é V = 0, embaixo; na tela, a de cima.
    for (let row = 0; row < height; row++)
      data.data.set(
        pixels.subarray(row * width * 4, (row + 1) * width * 4),
        (height - 1 - row) * width * 4,
      )
    context.putImageData(data, 0, 0)
  }, [image, palette, base, region, width, height])
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
  /** O texel sob o dedo, contando a margem do `object-contain` quando a face não tem o formato do palco. */
  function texel(clientX: number, clientY: number): Texel | null {
    const box = canvas.current?.getBoundingClientRect()
    if (!box?.width || !box.height) return null
    const scale = Math.min(box.width / width, box.height / height)
    const left = box.left + (box.width - width * scale) / 2
    const top = box.top + (box.height - height * scale) / 2
    const u = (clientX - left) / (width * scale)
    const v = 1 - (clientY - top) / (height * scale)
    if (u < 0 || v < 0 || u > 1 || v > 1) return null
    return [
      region.x0 + Math.min(width - 1, Math.floor(u * width)),
      region.y0 + Math.min(height - 1, Math.floor(v * height)),
    ]
  }
  const sample = (point: Texel) => ({ point, region: 'perto', bounds: region })
  function finish(commit: boolean) {
    const id = pointer.current
    pointer.current = null
    if (id === null) return
    if (canvas.current?.hasPointerCapture?.(id)) canvas.current.releasePointerCapture(id)
    live.current.end(commit)
  }
  return (
    <section
      aria-label={SCENE_PAINT_COPY.closeUp}
      className="absolute inset-0 z-30 flex flex-col gap-2 bg-mld-bg p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="mld-display text-lg">{SCENE_PAINT_COPY.closeUp}</h2>
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
