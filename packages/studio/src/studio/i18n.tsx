import { createContext, type JSX, type ReactNode, useContext, useMemo } from 'react'
import { createTranslator, type Locale, type Translator } from '#core'

const defaultTranslator = createTranslator('pt-BR')
const StudioI18nContext = createContext<Translator>(defaultTranslator)

export function StudioI18nProvider({
  locale = 'pt-BR',
  children,
}: {
  locale?: Locale
  children: ReactNode
}): JSX.Element {
  const translator = useMemo(() => createTranslator(locale), [locale])
  return <StudioI18nContext.Provider value={translator}>{children}</StudioI18nContext.Provider>
}

/** Tradutor da instância Studio mais próxima; fora dela, usa pt-BR. */
export function useT(): Translator {
  return useContext(StudioI18nContext)
}
