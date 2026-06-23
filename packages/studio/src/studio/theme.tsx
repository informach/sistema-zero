import type { JSX, ReactNode } from 'react'
import { createContext, useContext } from 'react'

export type StudioTheme = 'dark' | 'light'

// Tema efetivo da instância do Studio. Os tokens CSS (--color-sz-*) são
// escopados por [data-sz-theme] no ROOT do componente — mas conteúdo PORTALADO
// para document.body (Modal, menus) sai desse escopo. Quem portala envolve o
// conteúdo em <StudioThemeScope> para reaplicar o atributo.
const StudioThemeContext = createContext<StudioTheme>('light')

export const StudioThemeProvider = StudioThemeContext.Provider

export function useStudioTheme(): StudioTheme {
  return useContext(StudioThemeContext)
}

/** Reaplica o escopo de tema em subárvores portaladas para fora do root. */
export function StudioThemeScope({ children }: { children: ReactNode }): JSX.Element {
  const theme = useStudioTheme()
  return (
    <div data-sz-theme={theme} className="contents">
      {children}
    </div>
  )
}
