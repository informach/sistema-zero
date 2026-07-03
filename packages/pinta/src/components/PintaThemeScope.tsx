import type { JSX, ReactNode } from 'react'
import { createContext, useContext } from 'react'

export type PintaTheme = 'light' | 'dark'

// Tema efetivo da instância do Pinta. Os tokens CSS (--color-pin-*) são
// escopados por [data-pinta-theme] no ROOT do componente — conteúdo PORTALADO
// para document.body sai desse escopo e precisa do <PintaThemeScope> (mesma
// mecânica do StudioThemeScope/PensaThemeScope).
const PintaThemeContext = createContext<PintaTheme>('light')

export const PintaThemeProvider = PintaThemeContext.Provider

export function usePintaTheme(): PintaTheme {
  return useContext(PintaThemeContext)
}

/** Reaplica o escopo de tema em subárvores portaladas para fora do root. */
export function PintaThemeScope({ children }: { children: ReactNode }): JSX.Element {
  const theme = usePintaTheme()
  return (
    <div data-pinta-theme={theme} className="contents">
      {children}
    </div>
  )
}
