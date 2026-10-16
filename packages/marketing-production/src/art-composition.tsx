import { artText } from '@sistemazero/marketing-contracts'
import '@fontsource/nunito/latin-ext-600.css'
import '@fontsource/nunito/latin-ext-800.css'
import '@fontsource/nunito/latin-600.css'
import '@fontsource/nunito/latin-800.css'
import { useLayoutEffect, useRef } from 'react'
import {
  AbsoluteFill,
  cancelRender,
  continueRender,
  delayRender,
  Img,
  useCurrentFrame,
} from 'remotion'
import type { ArtProps } from './art-props'
import { useCompositionFonts } from './composition-fonts'

export type { ArtProps } from './art-props'
/** The browser preview and local renderer consume the same immutable recipe. */
export function ArtCompositionView({ composition, body, title, assets }: ArtProps) {
  const root = useRef<HTMLDivElement>(null)
  const frame = useCurrentFrame()
  const font = composition.fontAssetId ? assets[composition.fontAssetId] : undefined
  const family = composition.fontAssetId ? `marketing-${composition.fontAssetId}` : 'Nunito'
  const fontReady = useCompositionFonts([
    { family, url: font, required: Boolean(composition.fontAssetId) },
  ])
  useLayoutEffect(() => {
    let alive = true
    let released = false
    const handle = delayRender(`Conferindo textos da arte no quadro ${frame}`)
    const release = () => {
      if (!released) {
        released = true
        continueRender(handle)
      }
    }
    const load = async () => {
      await fontReady.current
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      if (!alive) return
      const expected = new Map(
        composition.layers.flatMap((layer) =>
          layer.kind === 'text' ? [[layer.id, artText(layer, { body, title })] as const] : [],
        ),
      )
      const boxes: Array<DOMRect> = []
      for (const element of root.current?.querySelectorAll('[data-art-text]') ?? []) {
        if (element.textContent !== expected.get(element.getAttribute('data-art-text') ?? ''))
          throw new Error('O texto renderizado não corresponde à copy desta revisão')
        if (!element.textContent?.trim()) continue
        const range = document.createRange()
        range.selectNodeContents(element)
        const ink = range.getBoundingClientRect()
        if (
          element.scrollWidth > element.clientWidth + 1 ||
          element.scrollHeight > element.clientHeight + 1
        ) {
          throw new Error(
            'A copy ultrapassa a área de texto. Peça à IA para ajustar a montagem antes de exportar.',
          )
        }
        if (
          boxes.some(
            (box) =>
              Math.min(box.right, ink.right) - Math.max(box.left, ink.left) > 2 &&
              Math.min(box.bottom, ink.bottom) - Math.max(box.top, ink.top) > 2,
          )
        )
          throw new Error(
            'Há textos sobrepostos na montagem. Ajuste a composição antes de exportar.',
          )
        boxes.push(ink)
      }
    }
    void load()
      .then(() => {
        if (alive) {
          release()
        }
      })
      .catch((error) => {
        if (alive) cancelRender(error)
      })
    return () => {
      alive = false
      release()
    }
  }, [composition, body, title, fontReady, frame])
  return (
    <AbsoluteFill
      ref={root}
      style={{
        background: composition.background,
        fontFamily: composition.fontAssetId ? `marketing-${composition.fontAssetId}` : 'Nunito',
      }}
    >
      {[
        ...composition.layers.filter((layer) => layer.kind !== 'text'),
        ...composition.layers.filter((layer) => layer.kind === 'text'),
      ].map((layer) => {
        const style = {
          position: 'absolute' as const,
          left: layer.frame.x,
          top: layer.frame.y,
          width: layer.frame.width,
          height: layer.frame.height,
          opacity: layer.opacity,
          boxSizing: 'border-box' as const,
        }
        if (layer.kind === 'image') {
          const src = assets[layer.assetId]
          if (!src) throw new Error('A imagem da arte ainda não foi carregada')
          return (
            <Img
              key={layer.id}
              src={src}
              style={{ ...style, objectFit: layer.fit, borderRadius: layer.radius }}
            />
          )
        }
        if (layer.kind === 'shape')
          return (
            <div
              key={layer.id}
              style={{
                ...style,
                background: layer.color,
                borderRadius: layer.shape === 'ellipse' ? '50%' : layer.radius,
              }}
            />
          )
        return (
          <div
            key={layer.id}
            data-art-text={layer.id}
            style={{
              ...style,
              color: layer.color,
              fontSize: layer.fontSize,
              lineHeight: layer.lineHeight,
              fontWeight: layer.weight,
              textAlign: layer.align,
              whiteSpace: 'pre-wrap',
              overflowWrap: 'break-word',
            }}
          >
            {artText(layer, { body, title })}
          </div>
        )
      })}
    </AbsoluteFill>
  )
}
