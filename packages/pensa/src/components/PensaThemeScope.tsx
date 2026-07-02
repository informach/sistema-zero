import type { JSX, ReactNode } from 'react'
import { createContext, useContext } from 'react'

export type PensaTheme = 'light' | 'dark'

// Tema efetivo da instância do Pensa. Os tokens CSS (--color-pz-*) são
// escopados por [data-pensa-theme] no ROOT do componente — mas conteúdo
// PORTALADO para document.body sai desse escopo. Quem portala envolve o
// conteúdo em <PensaThemeScope> para reaplicar o atributo (mesma mecânica do
// StudioThemeScope do packages/studio).
const PensaThemeContext = createContext<PensaTheme>('light')

export const PensaThemeProvider = PensaThemeContext.Provider

export function usePensaTheme(): PensaTheme {
  return useContext(PensaThemeContext)
}

/** Reaplica o escopo de tema em subárvores portaladas para fora do root. */
export function PensaThemeScope({ children }: { children: ReactNode }): JSX.Element {
  const theme = usePensaTheme()
  return (
    <div data-pensa-theme={theme} className="contents">
      {children}
    </div>
  )
}
