import { createContext, useContext } from 'react'

/**
 * Menus e janelas como FOLHA que sobe de baixo (redesenho do Pro, celular). O `Menu` e o
 * `Modal` são portalados para fora do `[data-sz-pro-tier]`, então o CSS do tamanho não os
 * alcança: quem decide é este contexto, que o `Shell` liga só no Pro abaixo de 720px
 * (`proLayoutTier`). O padrão é `false`: clássico, lista de projetos e hosts sem Pro não mudam.
 * Portal herda contexto React, então vale também para a Topbar e as janelas do Shell.
 */
const StudioSheetContext = createContext(false)

export const StudioSheetProvider = StudioSheetContext.Provider

export function useStudioSheets(): boolean {
  return useContext(StudioSheetContext)
}
