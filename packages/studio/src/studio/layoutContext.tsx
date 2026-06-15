import type { JSX, ReactNode, RefObject } from 'react'
import { createContext, useContext, useMemo } from 'react'
import { STUDIO_COMPACT_MAX_PX, STUDIO_NARROW_MAX_PX } from '../components/layout/layoutBreakpoints'
import { useMeasuredWidth } from '../hooks/useMeasuredWidth'

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

/**
 * Mede a largura do ROOT do Studio e deriva os tiers de layout (wide/narrow/
 * compact) que decidem a ESTRUTURA geral (Shell wide×narrow, identidade da
 * Topbar). A responsividade de cada SEÇÃO (cabeçalho do Monaco, barra do Preview)
 * NÃO usa isto — mede o próprio contêiner via `useMeasuredWidth`, pois o painel
 * encolhe/cresce com o split independentemente do tamanho do Studio.
 */
export function useStudioWidth(ref: RefObject<HTMLElement | null>): StudioLayout {
  const width = useMeasuredWidth(ref)

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
