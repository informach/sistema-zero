import type { ComponentType } from 'react'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import {
  AbsoluteFill,
  cancelRender,
  continueRender,
  delayRender,
  Img,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'
import { useCompositionFonts } from '../composition-fonts'
import type { GeneratedProps } from './props'
import '@fontsource/nunito/latin-ext-600.css'
import '@fontsource/nunito/latin-ext-800.css'
import '@fontsource/nunito/latin-600.css'
import '@fontsource/nunito/latin-800.css'

type RuntimeProps = GeneratedProps['input'] & { assets: Record<string, string> }
const visualLibrary = Object.freeze({
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
})
function isComponent(value: unknown): value is ComponentType<RuntimeProps> {
  return typeof value === 'function'
}
function loadComponent(javascript: string) {
  const exports: { default?: unknown } = Object.create(null)
  const requireVisual = (name: string) => {
    if (name === 'react/jsx-runtime') return jsxRuntime
    if (name === 'remotion') return visualLibrary
    throw new Error('Dependência de composição não permitida')
  }
  // This module is bundled ONLY in the headless Remotion entry. Its input is
  // AST-validated/transpiled by the isolated worker; it never runs in the Electron
  // window with preload or in the web Player, which receive the validated WebM.
  new Function('require', 'exports', `"use strict";\n${javascript}`)(requireVisual, exports)
  if (!isComponent(exports.default)) throw new Error('A composição não exportou um componente')
  return exports.default
}
function textAlpha(element: Element) {
  const color = getComputedStyle(element).color
  if (color === 'transparent') return 0
  const alpha = /(?:^rgba\([^,]+,[^,]+,[^,]+,|\/)\s*([\d.]+)(%)?\s*\)$/.exec(color)
  return alpha ? Number(alpha[1]) / (alpha[2] ? 100 : 1) : 1
}
function visible(element: Element, root: Element) {
  if (textAlpha(element) < 0.01) return false
  for (let current: Element | null = element; current; current = current.parentElement) {
    const style = getComputedStyle(current)
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) < 0.01)
      return false
    if (current === root) break
  }
  return true
}
function readable(element: Element, root: Element, minimumFontSize: number) {
  const style = getComputedStyle(element)
  if (Number.parseFloat(style.fontSize) < minimumFontSize) return false
  let opacity = textAlpha(element)
  for (let current: Element | null = element; current; current = current.parentElement) {
    opacity *= Number(getComputedStyle(current).opacity)
    if (current === root) break
  }
  return opacity >= 0.5
}
const normalized = (value: string) => value.replace(/\s+/g, ' ').trim()

export function GeneratedCompositionView({ input, javascript, assets }: GeneratedProps) {
  const Generated = useMemo(() => loadComponent(javascript), [javascript]),
    root = useRef<HTMLDivElement>(null),
    frame = useCurrentFrame(),
    family = input.fontAssetId ? `marketing-generated-${input.fontAssetId}` : 'Nunito',
    fontReady = useCompositionFonts([
      {
        family,
        url: input.fontAssetId ? assets[input.fontAssetId] : undefined,
        required: Boolean(input.fontAssetId),
      },
      { family: 'Nunito', required: false },
    ])
  useLayoutEffect(() => {
    const handle = delayRender('Validando a composição criada por IA')
    let live = true,
      released = false
    const release = () => {
      if (!released) {
        released = true
        continueRender(handle)
      }
    }
    void (async () => {
      await fontReady.current
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      const element = root.current
      if (!live || !element) return
      const bounds = element.getBoundingClientRect(),
        text: string[] = [],
        boxes: DOMRect[] = [],
        walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
      let current = walker.nextNode()
      while (current) {
        const content = current.textContent ?? '',
          parent = current.parentElement
        if (content.trim() && parent && visible(parent, element)) {
          const range = document.createRange()
          range.selectNodeContents(current)
          const ink = range.getBoundingClientRect()
          if (ink.width > 0 && ink.height > 0) {
            if (
              ink.left < bounds.left - 1 ||
              ink.right > bounds.right + 1 ||
              ink.top < bounds.top - 1 ||
              ink.bottom > bounds.bottom + 1
            )
              throw new Error(`Há texto fora da composição no quadro ${frame}`)
            if (
              boxes.some(
                (box) =>
                  Math.min(box.right, ink.right) - Math.max(box.left, ink.left) > 2 &&
                  Math.min(box.bottom, ink.bottom) - Math.max(box.top, ink.top) > 2,
              )
            )
              throw new Error(`Há textos sobrepostos na composição no quadro ${frame}`)
            boxes.push(ink)
            if (
              readable(parent, element, Math.max(12, Math.min(input.width, input.height) * 0.025))
            )
              text.push(content)
          }
        }
        current = walker.nextNode()
      }
      const content = normalized(text.join(' '))
      console.log(
        `marketing-composition-check:${JSON.stringify({ frame, seen: input.requiredText.flatMap((value, index) => (content.includes(normalized(value)) ? [index] : [])) })}`,
      )
    })()
      .then(() => {
        if (live) release()
      })
      .catch((error) => {
        if (live) cancelRender(error)
      })
    return () => {
      live = false
      release()
    }
  }, [fontReady, frame, input.requiredText, input.width, input.height])
  return (
    <AbsoluteFill ref={root} style={{ fontFamily: family, overflow: 'hidden' }}>
      <Generated {...input} assets={assets} />
    </AbsoluteFill>
  )
}
