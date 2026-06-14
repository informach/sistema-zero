import type { JSX, ReactNode, RefObject } from 'react'
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { STUDIO_COMPACT_MAX_PX, STUDIO_NARROW_MAX_PX } from '../components/layout/layoutBreakpoints'

export interface StudioLayout {
  /** Largura atual do root do Studio em px (0 antes da 1ª medição). */
  width: number
  /** Abaixo de STUDIO_NARROW_MAX_PX: painéis lado a lado viram abas. */
  isNarrow: boolean
  /** Abaixo de STUDIO_COMPACT_MAX_PX: micro-ajustes de identidade na Topbar. */
  isCompact: boolean
}

const DEFAULT_LAYOUT: StudioLayout = { width: 0, isNarrow: false, isCompact: false }

const StudioLayoutContext = createContext<StudioLayout>(DEFAULT_LAYOUT)

/** Lê os tiers de layout do <Studio> mais próximo (default = wide fora do provider). */
export function useStudioLayout(): StudioLayout {
  return useContext(StudioLayoutContext)
}

// useLayoutEffect no cliente evita um frame pintado com o layout errado; no SSR
// cai pra useEffect (o Studio é montado client-only, mas o guard mantém o import
// seguro e sem warning).
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/**
 * Mede a largura do elemento via ResizeObserver e deriva os tiers de layout.
 * Sem ResizeObserver (happy-dom/SSR) fica na medição inicial síncrona (ou 0,
 * tratado como wide pelos consumidores).
 */
export function useStudioWidth(ref: RefObject<HTMLElement | null>): StudioLayout {
  const [width, setWidth] = useState(0)

  useIsoLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = (w: number) => setWidth((prev) => (Math.abs(prev - w) < 0.5 ? prev : w))
    update(el.getBoundingClientRect().width)
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) update(entry.contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])

  return useMemo<StudioLayout>(
    () => ({
      width,
      isNarrow: width > 0 && width < STUDIO_NARROW_MAX_PX,
      isCompact: width > 0 && width < STUDIO_COMPACT_MAX_PX,
    }),
    [width],
  )
}

export function StudioLayoutProvider({
  value,
  children,
}: {
  value: StudioLayout
  children: ReactNode
}): JSX.Element {
  return <StudioLayoutContext.Provider value={value}>{children}</StudioLayoutContext.Provider>
}
