/**
 * O palco como hook: cria na montagem (pela fábrica injetável), descarta na
 * desmontagem. Sem WebGL (`WebGLRenderer` lança) → `unsupported`, e a tela
 * mostra um recado em vez de quebrar.
 */
import { type RefObject, useEffect, useRef, useState } from 'react'
import { createMoldaViewport } from './factory'
import type { MoldaViewportLike, ViewportCallbacks, ViewportOptions } from './types'

export interface UseViewportResult {
  canvasRef: RefObject<HTMLCanvasElement | null>
  viewport: MoldaViewportLike | null
  unsupported: boolean
}

export function useViewport(
  callbacks: ViewportCallbacks,
  options: ViewportOptions,
): UseViewportResult {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks
  const optionsRef = useRef(options)
  optionsRef.current = options
  const [viewport, setViewport] = useState<MoldaViewportLike | null>(null)
  const [unsupported, setUnsupported] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let instance: MoldaViewportLike
    try {
      instance = createMoldaViewport(
        canvas,
        {
          onSelect: (id) => callbacksRef.current.onSelect(id),
          onPlace: (shape, point, normal, nearId) =>
            callbacksRef.current.onPlace(shape, point, normal, nearId),
          onDragStart: (id) => callbacksRef.current.onDragStart(id),
          onDragMove: (patch) => callbacksRef.current.onDragMove(patch),
          onDragEnd: (patch) => callbacksRef.current.onDragEnd(patch),
          onPaintStart: () => callbacksRef.current.onPaintStart(),
          onPaintEnd: (model) => callbacksRef.current.onPaintEnd(model),
          onPickColor: (index) => callbacksRef.current.onPickColor(index),
          onAtlas: (info) => callbacksRef.current.onAtlas(info),
        },
        optionsRef.current,
      )
    } catch {
      setUnsupported(true)
      return
    }
    setViewport(instance)
    return () => {
      instance.dispose()
      setViewport(null)
    }
  }, [])

  return { canvasRef, viewport, unsupported }
}
